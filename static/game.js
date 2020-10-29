
//game.js core game logic for Who's The Bot
//Last Update 10/29/2020
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
    timeLeft: 30,
    SessionID: 0,
    playerQuit: false,
    searching: true
  },
  created () {
    let url = new URL(window.location.href);
    let name = url.searchParams.get("username");
    this.username = name;
    this.createChannel();
    this.listeners();
  },
  methods: {
    //Creates client private websocket channel to receive game data
    createChannel: function () {
      this.myChannel = this.pusher.subscribe('private-' + this.username);
    },
    //connects player to matchmaking lobby. Receives update triggers to add or
    //remove players who join or leave lobby
    subscribe: function () {
      let channel = this.pusher.subscribe('presence-guessbot');
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
        if(this.searching){
          this.searching = false
          this.choosePlayer()
        }

      });
      channel.bind('pusher:member_removed', (player) => {
        this.players--;
        var index = this.connectedPlayers.indexOf(player.id);
        if(index > -1) {
          this.connectedPlayers.splice(index,1)
        }
      });
    },
    //creates all listener bindings to receive websocket triggers
    //Human Player Type == 1
    //Bot Player Type == 2
    listeners: function () {
      this.pusher.bind('client-' + this.username, (message) => {
        this.otherPlayerName = message
        this.searching = false;
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
      this.myChannel.bind('client-sessionid', (id) => {
        this.SessionID = id.id
      })
      this.myChannel.bind('client-iquit', (id) => {
        this.playerQuit = true
        this.status = "Other Player Quit"
      })
    },
    //called if player joins matchmaking lobby with other waiting players
    //selects a random player and begins the game initialization
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
    //loads game screen based on payer type
    //triggers database insert of game session data
    //starts timer for bot player first turn
    startGame: function() {
      this.status = "Game started with " + this.otherPlayerName
      this.$refs.matchmakingScreen.classList.add('invisible');
      this.$refs.gameover.classList.add('invisible');
      this.round = 1;
      this.$refs.scoreboard.classList.remove('invisible');
      if(this.playerType === 1){
        this.$refs.humanboard.classList.remove('invisible');
        this.addMatch();
        this.otherPlayerChannel.trigger('client-sessionid', {id:this.SessionID});
      } else {
        this.$refs.botboard.classList.remove('invisible');
        this.isTurn = 1;
        this.startTimer()
      }
    },
    gameDeclined: function() {
      this.status = "Game declined"
    },
    //called when player sets ready status. Triggers startGame if both players ready
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
    //returns a random integer between min (inclusive) and max (exclusive)
    getRndInteger: function(min, max) {
      return Math.floor(Math.random() * (max - min)) + min;
    },
    //starts bot turn with data from humansubmit
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
    //starts human turn with data from botsubmit
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
    //submits data from bot player turn
    botSubmit: function() {
      if(this.isTurn === 1){
        this.stopTimer()
        this.playerresponse = this.$refs.botsubmit.value
        this.otherPlayerChannel.trigger('client-human-turn', {question:this.question, pmessage:this.playerresponse, bmessage:this.botresponse})
        this.isTurn = 0
      }
    },
    //submits default data if turn is exceeded
    botSubmitDefault: function() {
      if(this.isTurn === 1){
        this.playerresponse = 'Player took too long to respond!'
        this.otherPlayerChannel.trigger('client-human-turn', {question:this.question, pmessage:this.playerresponse, bmessage:this.botresponse})
        this.isTurn = 0
      }
    },
    //submits data from human player turn if left option is chosen
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
    //submits data from human player turn if right option is chosen
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
    //submits default data if time limit is exceeded
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
    //sets game over status details after final game round
    //sends score updates to database
    gameOver: function() {
      this.status = "Game Over"
      if(this.playerType === 1){
        this.updateHumanScore();
        this.$refs.humanboard.classList.add('invisible');
        if(this.correctCount > 2){
          this.question = "YOU WIN!!"
        } else {
          this.question = "YOU LOSE!"
        }
      } else {
        this.updateBotScore();
        this.$refs.botboard.classList.add('invisible');
        if(this.correctCount > 2) {
          this.question = "YOU LOSE!"
        } else {
          this.question = "YOU WIN!"
        }
      }
      this.$refs.gameover.classList.remove('invisible');
      this.canReady = 0
      this.ready = 0
      this.otherReady = 0
      this.readyDisplay = "want to Rematch?"
      this.otherReadyDisplay = "Waiting for other player..."
    },
    //resets values and triggers ready status for rematch
    rematch: function () {
      if(!this.playerQuit){
        this.status = "Awaiting Other Player Choice"
        this.readyDisplay = "Not Ready"
        this.round = 0
        this.score = 0
        this.isTurn = 0
        this.question = 'Awaiting first question'
        this.questionResults = ["Pending","Pending","Pending","Pending","Pending"]
        this.botresponse = 'dummy bot response'
        this.playerresponse = 'dummy player response'
        this.option1 = 'Awaiting Bot Response'
        this.option2 = 'Awaiting Bot Response'
        this.correctCount = 0
        this.timePassed = 0
        this.timeLeft = 30
        this.canReady = 1
      } else {
        this.readyDisplay = "Cannot Ready"
        this.otherReadyDisplay = "Player has left the lobby"
      }
    },
    //returns player to main menu if Main Menu is chosen at game over
    quitgame: function () {
      this.otherPlayerChannel.trigger('client-iquit', {id:1})
      window.location.replace(`/`);
    },
    //starts turn timer
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
    //stops turn timer
    stopTimer() {
      clearInterval(this.timerInterval)
    },
    //triggers default submit for bot turn if time limit is reached
    stopTimerBotTimeout: function() {
      this.stopTimer()
      this.botSubmitDefault()
    },
    //truggers default submit for human turn if time limit is reached
    stopTimerHumanTimeout: function() {
      this.stopTimer()
      this.humanSubmitDefault()
    },
    //inserts player details into database when match starts
    addMatch: async function(){
        await axios.post("http://3.19.145.43/database", {
            request_type: "add match",
            HumanUsername: this.username,
            BotUsername: this.otherPlayerName,
            MatchType: "random"
        }).then(
            res => this.SessionID = res['data'],
            error => console.log(error)
        );
    },
    //updates human player score in database after game ends
    updateHumanScore: async function(){
        await axios.post("http://3.19.145.43/database", {
            request_type: "update human score",
            HumanScore: this.score,
            "SessionID": this.SessionID
        }).then(
            res => console.log(res),
            error => console.log(error)
        );
    },
    //updates bot score in database after game ends
    updateBotScore: async function(){
        await axios.post("http://3.19.145.43/database", {
            request_type: "update bot score",
            BotScore: this.score,
            "SessionID": this.SessionID
        }).then(
            res => console.log(res),
            error => console.log(error)
        );
    }
  }
})
