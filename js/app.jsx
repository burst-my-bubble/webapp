import React from "react";
import ReactDOM from "react-dom";
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

class Home extends React.Component {
  render() {
    const articles = [...Array(12).keys()].map((a, i) => { 
      return <div className="col-md-3">
        <div className="card article">
          <img src="https://dummyimage.com/600x400/d9d9d9/000000" className="card-img-top"/>
          <div className="card-body">
            <p className="card-text">European elections 2019: Brexit Party dominates as Tories and Labour suffer</p>
            <a href="#" className="card-link">Comments</a>
          </div>
        </div>
      </div>;
    });
    return <div>
        <nav className="navbar navbar-dark navbar-expand-lg bg-primary">
          <a className="navbar-brand" href="#">Burst My Bubble</a>
          <ul className="navbar-nav mr-auto mt-2 mt-lg-0">
            <li className="nav-item">
              <a href="/" className="nav-link">Home</a>
            </li>
            <li className="nav-item">
              <a href="/categories" className="nav-link">Categories</a>
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
              <a href="/profile">
                <img className="profile" src={"https://graph.facebook.com/" + this.props.id + "/picture?type=normal"}/>
              </a>
            </li>
          </ul>
        </nav>
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
      ReactDOM.render(<Home id={response.authResponse.userID}/>, document.getElementById("container"));
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
      ReactDOM.render(<Home id={id}/>, document.getElementById("container"));
      FB.api("/" + id + "/friends", (res) => {
        console.log(res);
      });
    });  
  });
};
