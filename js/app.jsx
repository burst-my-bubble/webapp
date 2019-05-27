import React from "react";
import ReactDOM from "react-dom";
import { BrowserRouter as Router, Route, Link, Switch } from "react-router-dom";
import axios from "axios";

class Login extends React.Component {
  render() {
    return (
      <div className="fb-login-button" data-width="" data-size="large" data-button-type="continue_with" data-auto-logout-link="false" data-use-continue-as="true" data-scope="user_friends" data-onlogin="login()"></div>
    );
  }

  componentDidMount() {
    FB.XFBML.parse();
  }
};

const Profile = () => 
  <p>Profile Page</p>;

const Comments = () => 
  <p>Comments Page</p>;

const NoMatch = () =>
  <p>Page Not Found</p>;

const Main = (props) => 
<Router>
    <nav className="navbar navbar-dark navbar-expand-lg bg-primary">
          <a className="navbar-brand" href="#">Burst My Bubble</a>
          <ul className="navbar-nav mr-auto mt-2 mt-lg-0">
            <li className="nav-item">
              <Link to="/" className="nav-link">Home</Link>
            </li>
            <li className="nav-item">
              <Link to="/categories" className="nav-link">Categories</Link>
            </li>
            <li className="nav-item">
              <button onClick={() => {
          FB.logout();
          ReactDOM.render(<Login/>, document.getElementById("container"));
        }} className="btn btn-link nav-link" href="#">Logout</button>
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
    axios.get("http://localhost:5000/api/articles").then(({data}) => {
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
          <img src="https://dummyimage.com/600x400/d9d9d9/000000" className="card-img-top"/>
          <div className="card-body">
            <p className="card-text">{article.title}</p>
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
  FB.getLoginStatus(function(response) {
    if (response.status === "not_authorized" || response.status === "unknown") {
      ReactDOM.render(<Login/>, document.getElementById("container"));
    } else {
      ReactDOM.render(<Main id={response.authResponse.userID}/>, document.getElementById("container"));
    }
  });
};

window.login = () => {
  FB.api("/me", ({id, name}) => {
    axios.post('http://localhost:5000/api/register_user', {
      name: name,
      id: id
    })
    .then((response) => {
      ReactDOM.render(<Main id={id}/>, document.getElementById("container"));
      FB.api("/" + id + "/friends", (res) => {
        console.log(res);
      });
    });  
  });
};
