import mysql.connector

config = {
    "host": "3.19.145.43",
    "user": "psloth",
    "password": "psloths123",
    "database": "guessbot",
}
global mydb
global mycursor
__fail: str = "Failed Connection"


def __open_connection():
    global mydb
    global mycursor
    mydb = mysql.connector.connect(**config)
    mycursor = mydb.cursor()


def __close_connection():
    mycursor.close()
    mydb.close()


# Creates match in database and returns the match id
def add_match(human_username, bot_username, match_type):
    try:
        __open_connection()
        query = "INSERT INTO Score (HumanUsername, BotUsername, HumanScore, BotScore, MatchType) " \
                "VALUES (%s, %s, 0, 0, %s);"
        values = (human_username, bot_username, match_type)
        mycursor.execute(query, values)
        mydb.commit()

        mycursor.execute("SELECT SessionID FROM Score WHERE your_table_primary_key = LAST_INSERT_ID();")
        res = mycursor.fetchone()
        __close_connection()
        return res
    except mysql.connector.Error:
        return __fail


def get_top_user_scores():
    try:
        __open_connection()
        mycursor.execute("SELECT * FROM Score ORDER BY HumanScore;")
        res = mycursor.fetchmany(3)
        __close_connection()
        return res
    except mysql.connector.Error:
        return __fail


def get_top_bot_scores():
    try:
        __open_connection()
        mycursor.execute("SELECT * FROM Score ORDER BY BotScore;")
        res = mycursor.fetchmany(3)
        __close_connection()
        return res
    except mysql.connector.Error:
        return __fail


def update_scores(human_score, bot_score, session_id):
    try:
        __open_connection()
        query = "UPDATE Score SET HumanScore=%s, BotScore=%s WHERE SessionID=%s;"
        values = (human_score, bot_score, session_id)
        mycursor.execute(query, values)
        mydb.commit()
        __close_connection()
        return "Success"
    except mysql.connector.Error:
        return __fail


# delete matches older than 30 days
def delete_old_scores():
    try:
        __open_connection()
        mycursor.execute("DELETE FROM Score WHERE Timestamp < now() - interval 30 DAY;")
        mydb.commit()
        __close_connection()
        return "Success"
    except mysql.connector.Error:
        return __fail