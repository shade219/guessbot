import mysql.connector
import random

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
    mycursor = mydb.cursor(buffered=True)


def __close_connection():
    mycursor.close()
    mydb.close()


# Creates match in database and returns the match id
def add_match(human_username, bot_username, match_type):
    try:
        __open_connection()
        query = ("INSERT INTO `Score` (`HumanUsername`, `BotUsername`, `HumanScore`, `BotScore`, `SessionID`, `MatchType`) VALUES (%s, %s, %s, %s, %s, %s)")
        values = (human_username, bot_username, 0, 0, None, match_type)
        mycursor.execute(query, values)
        mydb.commit()

        mycursor.execute("SELECT MAX(SessionID) FROM Score;")
        res = mycursor.fetchone()
        __close_connection()
        return str(res[0])
    except mysql.connector.Error as err:
        logf = open("sqlerrors.log", "a")
        logf.write("Failed connection: {}".format(err))
        logf.close()
        return __fail


def get_top_user_scores():
    try:
        __open_connection()
        mycursor.execute("SELECT * FROM `Score` ORDER BY `HumanScore` DESC;")
        res = mycursor.fetchmany(3)
        __close_connection()

        scores = {}
        for i in range(len(res)):
            scores[str(i)] = res[i]

        return scores
    except mysql.connector.Error:
        return __fail


def get_top_bot_scores():
    try:
        __open_connection()
        mycursor.execute("SELECT * FROM `Score` ORDER BY `BotScore` DESC;")
        res = mycursor.fetchmany(3)

        scores = {}
        for i in range(len(res)):
            scores[str(i)] = res[i]
        __close_connection()
        return scores
    except mysql.connector.Error:
        return __fail


def update_human_score(human_score, session_id):
    try:
        __open_connection()
        query = "UPDATE `Score` SET `HumanScore`='%s' WHERE `SessionID`='%s';"
        values = (human_score, session_id)
        mycursor.execute(query, values)
        mydb.commit()
        __close_connection()
        return "Success"
    except mysql.connector.Error:
        return __fail


def update_bot_score(bot_score, session_id):
    try:
        __open_connection()
        query = "UPDATE `Score` SET `BotScore`='%s' WHERE `SessionID`='%s';"
        values = (bot_score, session_id)
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
        mycursor.execute("DELETE FROM `Score` WHERE `Timestamp` < now() - interval 30 DAY;")
        mydb.commit()
        __close_connection()
        return "Success"
    except mysql.connector.Error:
        return __fail

def get_bot_QA():
    try:
        __open_connection()
        mycursor.execute("SELECT * FROM `QA`;")
        res = mycursor.fetchmany(39)
        index = random.randrange(0,39,1)
        result = []
        result[0] = res[index][0]
        result[1] = res[index][1]
        result[2] = "2"
        result[3] = "3"
        QAs = result
        __close_connection()
        return QAs
    except mysql.connector.Error:
        return __fail

# Fetches a random question from the chatterbot database.
def fetch_random_question():
    try:
        # temporary switch DB in the config -- Might be better to pass as parameter
        config['database'] = "chatterbot";
        __open_connection()
        config['database'] = "mysql";

        # Using Rand() limit 1 to retrieve a random response
        mycursor.execute("select in_response_to from( SELECT in_response_to FROM statement where in_response_to is not null)z order by RAND() limit 1 ")
        result = mycursor.fetchone()
        __close_connection()

        # returns a 1D tuple
        return result
    except mysql.connector.Error:
        return __fail

# Fetches a random answer from the chatterbot database.
# Best to pass a string - example for direct question/answer: fetch_random_answer(str(fetch_random_question()[0]));
def fetch_random_answer(question):
    try:
        # temporary switch DB in the config -- Might be better to pass as parameter
        config['database'] = "chatterbot";
        __open_connection()
        config['database'] = "mysql";

        # Using Rand() limit 1 to retrieve a random response
        query = ("select text FROM statement WHERE in_response_to = '"+ question + "' and in_response_to is not null order by rand() limit 1")
        mycursor.execute(query)
        result = mycursor.fetchone()
        __close_connection()

        # returns a 1D tuple
        return result

    except mysql.connector.Error:
        return __fail
