import pusher

pusher_client = pusher.Pusher(
  app_id='1083290',
  key='a7fd256e3117436dac89',
  secret='bb073a12a0d28e4b17ec',
  cluster='us2',
  ssl=True
)

pusher_client.trigger('my-channel', 'my-event', {'message': 'hello world'})
