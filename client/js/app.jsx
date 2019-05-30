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
        axios.post('/api/register_user', {
          name: name,
          id: id
        })
        .then((response) => {
          this.props.login(id);
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
        this.setState({loaded: true, id: response.authResponse.userID});
      }
    });
  }

  render() {
    if (!this.state.loaded) {
      return null;
    }

    if (!this.state.id) {
      return <Login login={(id) => this.setState({id: id})}/>;
    } else {
      return <Main id={this.state.id} logout={() => {
        FB.logout();
        this.setState({id: ""});
      }}/>
    }
  }
}

const Profile = () => 
  <p>Profile Page</p>;

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
        <Route path="/" exact component={() => <Home id={props.id}/>}/>
        <Route path="/profile" exact component={() => <Profile id={props.id}/>}/>
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
    axios.get("/api/articles").then(({data}) => {
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
          <a target="_blank" href={article.url}>
            <img src="https://dummyimage.com/600x400/d9d9d9/000000" className="card-img-top"/>
          </a>
          <div className="card-body">
            <p className="card-text">
              <a className="no-link" target="_blank" href={article.url}>{article.title}</a>
            </p>
            <Link to={"/article/" + id + "/comments"} className="card-link">Comments</Link>
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
}

window.ready = () => {
  ReactDOM.render(<App/>, document.getElementById("container"));
};


