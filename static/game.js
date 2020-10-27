
var app = new Vue({
  el: '#app',
  data: {
    username: '',
    players: 0,
    connectedPlayers: [],
    status: 'Waiting to start game...',
    pusher: new Pusher('a7fd256e3117436dac89', {
      authEndpoint: '/pusher/auth',
      cluster: 'us2',
      encrypted: true
    }),
    otherPlayerName: '',
    mychannel: {},
    otherPlayerChannel: {},
    playerType: 0,
    otherPlayerType: 0,
    canReady: 0,
    ready: 0,
    otherReady: 0,
    readyDisplay: 'Not Ready',
    otherReadyDisplay: 'Not Ready',
    round: 0,
    score: 0,
    isTurn: 0,
    question: 'Awaiting first question',
    questionResults: ["Pending","Pending","Pending","Pending","Pending"],
    botresponse: 'dummy bot response',
    playerresponse: 'dummy player response',
    option1: 'Awaiting Bot Response',
    option2: 'Awaiting Bot Response',
    randomPlacement: 0,
    correctCount: 0,
    timerInterval: null,
    timePassed: 0,
    timeLimit: 30,
    timeLeft: 30
  },
  created () {
    let url = new URL(window.location.href);
    let name = url.searchParams.get("username");
    this.username = name;
    this.subscribe();
    this.listeners();
  },
  methods: {
    subscribe: function () {
      let channel = this.pusher.subscribe('presence-guessbot');
      this.myChannel = this.pusher.subscribe('private-' + this.username);
      channel.bind('pusher:subscription_succeeded', (player) => {
        this.players = player.count -1
        player.each((player) => {
          if (player.id != this.username)
            this.connectedPlayers.push(player.id)
        });
      });
      channel.bind('pusher:member_added', (player) => {
        this.players++;
        this.connectedPlayers.push(player.id)
      });
      channel.bind('pusher:member_removed', (player) => {
        this.players--;
        var index = this.connectedPlayers.indexOf(player.id);
        if(index > -1) {
          this.connectedPlayers.splice(index,1)
        }
      });
    },
    listeners: function () {
      this.pusher.bind('client-' + this.username, (message) => {
        this.otherPlayerName = message
        this.Status = "Connecting to other player..."
        this.playerType = this.getRndInteger(1,3)
        this.otherPlayerType = this.playerType === 1 ? 2 : 1
        this.otherPlayerChannel = this.pusher.subscribe('private-' + this.otherPlayerName)
        this.otherPlayerChannel.bind('pusher:subscription_succeeded', () => {
          this.otherPlayerChannel.trigger('client-game-started', {name:this.username, ptype:this.otherPlayerType, otype:this.playerType})
        })
        this.canReady = 1
        this.status = "Waiting for players to ready"
      })
      this.myChannel.bind('client-game-started', (message) => {
        this.playerType = message.ptype
        this.otherPlayerType = message.otype
        this.canReady = 1
        this.status = "Waiting for players to ready"
      })
      this.myChannel.bind('client-game-declined', () => {
        this.status = "Game declined"
      })
      this.myChannel.bind('client-human-turn', (message) => {
        this.humanTurn(message)
      })
      this.myChannel.bind('client-bot-turn', (message) => {
        this.botTurn(message)
      })
      this.myChannel.bind('client-ready', (rdy) => {
        this.otherReady = 1
        this.otherReadyDisplay = "Ready!"
      })
      this.myChannel.bind('client-start', (rdy) => {
        this.startGame()
      })
    },
    choosePlayer: function() {
      var matchFound = false
      while(!matchFound){
        if(this.connectedPlayers.length>0){
          matchFound = true
          this.status = "Connecting to other player..."
          var temp = this.getRndInteger(0,this.connectedPlayers.length)
          this.otherPlayerName = this.connectedPlayers[temp]
          this.otherPlayerChannel = this.pusher.subscribe('private-' + this.otherPlayerName)
          this.otherPlayerChannel.bind('pusher:subscription_succeeded', () => {
            this.otherPlayerChannel.trigger('client-' + this.otherPlayerName, this.username)
          });
        }
      }
    },
    startGame: function() {
      this.status = "Game started with " + this.otherPlayerName
      this.$refs.matchmakingScreen.classList.add('invisible');
      this.round = 1;
      this.$refs.scoreboard.classList.remove('invisible');
      if(this.playerType === 1){
        this.$refs.humanboard.classList.remove('invisible');
        //Add axios post to create match
      } else {
        this.$refs.botboard.classList.remove('invisible');
        // Add axios post with human/bot switched to create match
        this.isTurn = 1;
        this.startTimer()
      }
    },
    gameDeclined: function() {
      this.status = "Game declined"
    },
    setReady: function() {
      if(this.canReady === 1){
        this.ready = 1
        this.readyDisplay = "Ready!"
        if(this.otherReady === 0){
          this.otherPlayerChannel.trigger("client-ready", {rdy:this.ready})
        } else {
          this.startGame()
          this.otherPlayerChannel.trigger("client-start", {rdy:this.ready})
        }
      }
    },
    getRndInteger: function(min, max) {
      return Math.floor(Math.random() * (max - min)) + min;
    },
    botTurn: function(message) {
      this.timeLeft = 30
      this.timePassed = 0
      if(message.answer === 1){
        this.questionResults[this.round-1] = "Correct!"
        this.correctCount += 1
      } else {
        this.questionResults[this.round-1] = "Incorrect!"
        this.score += 10
      }
      if(this.round === 5){
        this.gameOver()
      } else {
        this.round += 1
        this.isTurn = 1
        this.question = "new question: " + this.round
        this.startTimer()
      }
    },
    humanTurn: function(message) {
      this.timeLeft = 30
      this.timePassed = 0
      this.question = message.question
      this.playerresponse = message.pmessage
      this.botresponse = message.bmessage
      this.isTurn = 1
      this.randomPlacement = this.getRndInteger(1,3)
      if(this.randomPlacement === 1){
        this.option1 = this.playerresponse
        this.option2 = this.botresponse
      } else {
        this.option2 = this.playerresponse
        this.option1 = this.botresponse
      }
      this.startTimer()
    },
    botSubmit: function() {
      if(this.isTurn === 1){
        this.stopTimer()
        this.playerresponse = this.$refs.botsubmit.value
        this.otherPlayerChannel.trigger('client-human-turn', {question:this.question, pmessage:this.playerresponse, bmessage:this.botresponse})
        this.isTurn = 0
      }
    },
    botSubmitDefault: function() {
      if(this.isTurn === 1){
        this.playerresponse = 'Player took too long to respond!'
        this.otherPlayerChannel.trigger('client-human-turn', {question:this.question, pmessage:this.playerresponse, bmessage:this.botresponse})
        this.isTurn = 0
      }
    },
    humanSubmit1: function() {
      this.stopTimer()
      if(this.isTurn === 1){
        if(this.randomPlacement === 2){
          this.questionResults[this.round-1] = "Correct!"
          this.correctCount += 1
          this.score += 10
          this.question = "Awaiting Next Question"
          this.round += 1
          this.isTurn = 0
          this.otherPlayerChannel.trigger('client-bot-turn', {answer:1})
        } else {
          this.questionResults[this.round-1] = "Incorrect!"
          this.question = "Awaiting Next Question"
          this.round += 1
          this.isTurn = 0
          this.otherPlayerChannel.trigger('client-bot-turn', {answer:0})
        }
        if(this.round > 5){
          this.gameOver()
        }
      }
    },
    humanSubmit2: function() {
      this.stopTimer()
      if(this.isTurn === 1){
        if(this.randomPlacement === 1){
          this.questionResults[this.round-1] = "Correct!"
          this.correctCount += 1
          this.score += 10
          this.question = "Awaiting Next Question"
          this.round += 1
          this.isTurn = 0
          this.otherPlayerChannel.trigger('client-bot-turn', {answer:1})
        } else {
          this.questionResults[this.round-1] = "Incorrect!"
          this.question = "Awaiting Next Question"
          this.round += 1
          this.isTurn = 0
          this.otherPlayerChannel.trigger('client-bot-turn', {answer:0})
        }
        if(this.round > 5){
          this.gameOver()
        }
      }
    },
    humanSubmitDefault: function() {
      this.questionResults[this.round-1] = "Incorrect!"
      this.question = "Awaiting Next Question"
      this.round += 1
      this.isTurn = 0
      this.otherPlayerChannel.trigger('client-bot-turn', {answer:0})
      if(this.round > 5){
        this.gameOver()
      }
    },
    gameOver: function() {
    // Add post to update the final score to the database
      if(this.playerType === 1){
        if(this.correctCount > 2){
          this.question = "YOU WIN!!"
        } else {
          this.question = "YOU LOSE!"
        }
      } else {
        if(this.correctCount > 2) {
          this.question = "YOU LOSE!"
        } else {
          this.question = "YOU WIN!"
        }
      }
    },
    startTimer() {
      this.timerInterval = setInterval(() => {
        this.timePassed += 1;
        this.timeLeft = this.timeLimit-this.timePassed;
        if(this.timePassed >= 30){
          if(this.playerType === 2){
            this.stopTimerBotTimeout()
          } else {
            this.stopTimerHumanTimeout()
          }
        }
      },1000)
    },
    stopTimer() {
      clearInterval(this.timerInterval)
    },
    stopTimerBotTimeout: function() {
      this.stopTimer()
      this.botSubmitDefault()
    },
    stopTimerHumanTimeout: function() {
      this.stopTimer()
      this.humanSubmitDefault()
    }
  }
})
