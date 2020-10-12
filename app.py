from flask import Flask, render_template, request, jsonify, make_response, json
import pusher

#Use to change flask variable strings from {{ variable }} to %% variable %%
class CustomFlask(Flask):
	jinja_options = Flask.jinja_options.copy()
	jinja_options.update(dict(
		variable_start_string='%%',
		variable_end_string='%%'
		))

app = Flask(__name__)
pusher_client = pusher.Pusher(
  app_id='1083290',
  key='a7fd256e3117436dac89',
  secret='bb073a12a0d28e4b17ec',
  cluster='us2',
  ssl=True
)
name = ''

#login screen with username request
@app.route('/')
def index():
	return render_template('index.html')

@app.route('/about')
def about():
	return render_template('about.html')

@app.route('/rules')
def rules():
	return render_template('rules.html')

#test pusher trigger
@app.route('/index')
def indexPy():
	pusher_client.trigger('guess-bot', 'my-event', {'message': 'hello world'})
	return render_template('trigger.html')

#takes username input from index.html and loads game page
@app.route('/game')
def game():
	global name
	name = request.args.get('username')
	return render_template('game.html')

#default authentication response to pusher auth request
@app.route('/pusher/auth', methods=['POST'])
def pusher_authentication():
	auth = pusher_client.authenticate(
		channel=request.form['channel_name'],
		socket_id=request.form['socket_id'],
		custom_data={
			u'user_id': name,
			u'user_info': {
				u'role': u'player'
			}
		}
	)
	return json.dumps(auth)

if __name__ == '__main__':
	app.run(host='0.0.0.0', port=5000, debug=True)
name = ''
