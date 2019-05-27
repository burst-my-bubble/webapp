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
    return <div>
        <img src={"https://graph.facebook.com/" + this.props.id + "/picture?type=square"}/>
        <button onClick={() => {
          FB.logout();
          ReactDOM.render(<Login/>, document.getElementById("container"));
        }}>Logout</button>
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
