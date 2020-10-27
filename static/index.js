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
        // Add function to send request to delete old messages and fetch the top high scores for bot and human
        load: async function(){
            await axios.post("http://localhost:5000/database", {
                request_type : "delete old scores"
            }).then(
                res => console.log(res),
                error => console.log(error)
            );
            await axios.post("http://localhost:5000/database", {
                request_type: "get top user scores"
            }).then(
                res => {
                    console.log(res)
                },
                error => console.log(error)
            );
            await axios.post("http://localhost:5000/database", {
                request_type : "get top bot scores"
            }).then(
                res => console.log(res),
                error => console.log(error)
            );
        }
    }
})
