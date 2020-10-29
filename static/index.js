var app = new Vue({
    el: "#app",
    mounted: function(){
        this.load()
    },
    methods: {
        login: function() {
            let username = this.$refs.username.value
            window.location.replace(`/game?username=${username}`);
        },
        // Add function to send request to delete old messages and fetch the top highschores for bot and human
        load: async function(){
            await axios.post("http://3.19.145.43/database", {
                request_type : "delete old scores"
            }).then(
                res => console.log(res),
                error => console.log(error)
            );
            await axios.post("http://3.19.145.43/database", {
                request_type: "get top user scores"
            }).then(
                res => {
                    var temp
                    var i = 0
                    var list = ["top human", "second human", "third human"]
                    while(i < 3){
                        temp = res['data'][i.toString()]['0']
                        document.getElementById(list[i]).innerHTML = temp

                        temp = res['data'][i.toString()]['2']
                        document.getElementById(list[i] + " score").innerHTML = temp
                        i++
                    }
                },
                error => console.log(error)
            );
            await axios.post("http://3.19.145.43/database", {
                request_type : "get top bot scores"
            }).then(
                res => {
                    var temp
                    var i = 0
                    var list = ["top bot", "second bot", "third bot"]
                    while(i < 3){
                        temp = res['data'][i.toString()]['1']
                        document.getElementById(list[i]).innerHTML = temp

                        temp = res['data'][i.toString()]['3']
                        document.getElementById(list[i] + " score").innerHTML = temp
                        i++
                    }
                },
                error => console.log(error)
            );
        }
    }
})
