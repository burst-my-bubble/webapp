import React from "react";
import ReactDOM from "react-dom";
import axios from "axios";
import { BrowserRouter as Router, Route, Link, Switch } from "react-router-dom";

class Login extends React.Component {
  render() {
    return (
      <div className="fb-login-button" data-width="" data-size="large" data-button-type="continue_with" data-auto-logout-link="false" data-use-continue-as="true" data-scope="user_friends" data-onlogin="login()"></div>
    );
  }

  componentDidMount() {
    window.login = () => {
      FB.api("/me", ({id, name}) => {
        axios.post(SERVER_URI + 'api/register_user', {
          name: name,
          id: id
        })
        .then((response) => {
          console.log(response)
          this.props.login(id, response.data._id);
          /*FB.api("/" + id + "/friends", (res) => {
            console.log(res);
          });*/
        });  
      });
    };
    FB.XFBML.parse();
  }
};

class App extends React.Component {
  constructor() {
    super();
    this.state = {
      loaded: false
    };
    FB.getLoginStatus((response) => {
      if (response.status === "not_authorized" || response.status === "unknown") {
        this.setState({loaded: true, id: ""});
      } else {
        axios.post(SERVER_URI + 'api/get_user_id', {
          id: response.authResponse.userID
        })
        .then((r) => {
          console.log(r)
          /*FB.api("/" + id + "/friends", (res) => {
            console.log(res);
          });*/
          this.setState({loaded: true, id: response.authResponse.userID, _id: r.data._id});
        }); 
      }
    });
  }

  render() {
    if (!this.state.loaded) {
      return null;
    }

    if (!this.state.id) {
      return <Login login={(id, _id) => this.setState({id: id, _id: _id})}/>;
    } else {
      return <Main id={this.state.id} _id={this.state._id} logout={() => {
        FB.logout();
        this.setState({id: ""});
      }}/>
    }
  }
}

class Profile extends React.Component {
  constructor(props) {
    super();
    this.state = {
      loaded: false
    };
    axios.post(SERVER_URI + "api/all_articles", {user_id: props._id}).then(({data}) => {
      console.log("helloao");
      this.setState({
        loaded: true,
        data: data
      });
    });
  }
  render() {
    if (!this.state.loaded) {
      return null;
    }
    console.log(this.state.data);
    const articles = this.state.data.sort((a, b) => b.access_time["$date"] - a.access_time["$date"]).map(article => 
      <li key={article._id}><a href={article.url}>{article.title}</a> ({new Date(article.access_time["$date"]).toString()})</li>);
    return <ul>{articles}</ul>;
  }
}

const Comments = () => 
  <p>Comments Page</p>;

const NoMatch = () =>
  <p>Page Not Found</p>;

const Main = (props) => 
<Router>
    <nav className="navbar navbar-dark navbar-expand-lg bg-primary">
          <ul className="navbar-nav mr-auto mt-2 mt-lg-0">
            <li className="nav-item">
              <Link className="navbar-brand" to="/">Burst Your Bubble</Link>
            </li>
            <li className="nav-item">
              <Link to="/" className="nav-link">Home</Link>
            </li>
            <li className="nav-item">
              <Link to="/categories" className="nav-link">Categories</Link>
            </li>
            <li className="nav-item">
              <button onClick={props.logout} className="btn btn-link nav-link" href="#">Logout</button>
            </li>
          </ul>
          <ul className="navbar-nav">
            <li className="nav-item">
              <Link to="/profile">
                <img className="profile" src={"https://graph.facebook.com/" + props.id + "/picture?type=normal"}/>
              </Link>
            </li>
          </ul>
        </nav>
      <Switch>
        <Route path="/" exact component={() => <Home id={props.id} _id={props._id}/>}/>
        <Route path="/profile" exact component={() => <Profile _id={props._id} id={props.id}/>}/>
        <Route path="/article/:id/comments" exact component={() => <Comments id={props.id}/>}/>
        <Route component={NoMatch}></Route>
      </Switch>
    </Router>;

class Home extends React.Component {
  constructor() {
    super();
    this.state = {
      loaded: false
    };
    axios.get(SERVER_URI + "api/articles").then(({data}) => {
      this.setState({
        loaded: true,
        data: data
      });
    });
  }
  render() {
    const articles = !this.state.loaded ? [] : this.state.data.map((article) => { 
      const id = article._id["$oid"];
      return <div className="col-md-3" key={id}>
        <div className="card article">
          <a onClick={() => this.markAsRead(article._id)} target="_blank" href={article.url}>
            <img src={article.image_url} className="card-img-top"/>
          </a>
          <div className="card-body">
            <p className="card-text">
              <a className="no-link" onClick={() => this.markAsRead(article._id)} target="_blank" href={article.url}>{article.title}</a>
            </p>
            <Link to={"/article/" + id + "/comments"} className="card-link">Comments</Link>
            
            <p style={"color:" + getColour(article.sentiment)}>◉</p>
          </div>
        </div>
      </div>;
    });
    return <div>
        <div className="container">
          <div className="row">
            {articles}
          </div>
        </div>
      </div>
  }

  markAsRead(id) {
    axios.post(SERVER_URI + "api/read", {user_id: this.props._id, article_id: id}).then(() => {
      console.log("sent");
    });
  }

  getColour(sentiment){
    if(sentiment < 0.2){
      return "rgb(255, 0, 0)";
    } else if (sentiment < 0.4) {
      return "rgb(246, 84, 0)";
    } else if (sentiment < 0.6) {
      return "rgb(243, 154, 0)";
    } else if (sentiment < 0.8) {
      return "rgb(194, 243, 0)";
    }
    return "rgb(1, 255, 0)";
  }
}

window.ready = () => {
  ReactDOM.render(<App/>, document.getElementById("container"));
};


