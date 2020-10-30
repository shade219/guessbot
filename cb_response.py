import sys, json
from chatterbot import ChatBot

from chatterbot.response_selection import get_random_response

# setup base chatterbot object with random responses based on response best match
chatbot = ChatBot(
'Chatbot',
storage_adapter='chatterbot.storage.SQLStorageAdapter',
logic_adapters=[
    #'chatterbot.logic.MathematicalEvaluation',
    #'chatterbot.logic.TimeLogicAdapter',
    'chatterbot.logic.BestMatch'
],
database_uri="mysql://psloth:psloths123@localhost:3306/chatterbot",
response_selection_method=get_random_response
)

#from chatterbot.trainers import ListTrainer
from chatterbot.trainers import ChatterBotCorpusTrainer

# path to corpus files for training
def trainBot():
    trainer = ChatterBotCorpusTrainer(chatbot)
    #
    trainer.train("./chatterbot_corpus/data/english/")

# pass a question through command line
def GetResponse():
    input = sys.argv[1]
    bot_response = chatbot.get_response(input)
    json.dumps(bot_response)

