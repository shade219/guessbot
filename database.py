import mysql.connector

config = {
    "host": "3.19.145.43",
    "user": "psloth",
    "password": "psloths123",
    "database": "guessbot",
}
global mydb
global mycursor


def __open_connection():
    global mydb
    global mycursor
    mydb = mysql.connector.connect(**config)
    mycursor = mydb.cursor()


def __close_connection():
    mycursor.close()
    mydb.close()


def add_score(human_username, bot_username, human_score, bot_score, match_type):
    try:
        __open_connection()
        query = "INSERT INTO Score (HumanUsername, BotUsername, HumanScore, BotScore, MatchType) " \
                "VALUES (%s, %s, %s, %s, %s)"
        values = {human_username, bot_username, human_score, bot_score, match_type}
        mycursor.execute(query, values)
        mydb.commit()
        __close_connection()
        return "Success"
    except mysql.connector.Error:
        return "Failed Connection"


def get_top_scores():
    try:
        __open_connection()
        mycursor.execute("SELECT * FROM Score ORDER BY HumanScore")
        res = mycursor.fetchmany(3)
        __close_connection()
        return res
    except mysql.connector.Error:
        return "Failed Connection"
