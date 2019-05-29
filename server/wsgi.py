from flup.server.fcgi import WSGIServer
from server import app

if __name__ == "__main__":
    WSGIServer(app, bindAddress="/fcgi.sock").run()