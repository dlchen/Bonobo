import React, {Component} from 'react';
const { render } = require('react-dom');
const HOST = 'http://localhost:3000/';

require("./scss/main.scss");
let socket = io.connect();

// TESTING RELATED --------------------- //
class App extends Component {
  constructor() {
      super();
      // this little chunk helps persist the current view across page refreshes
      // using localstorage
      let firstView;
      let currentRoomId;
      if (localStorage.getItem('lastView') !== null) {
        firstView = localStorage.getItem('lastView');
        currentRoomId = localStorage.getItem('lastRoom');
        socket.on(`${currentRoomId}`, (msg) => {
          console.log('socket msg received:', msg);
          this.addNewMessages(msg);
        });
      // Set defaults if this is their first time.
      } else {
        firstView = 'lobby';
        currentRoomId = '';
      }
      console.log(firstView, currentRoomId);
      this.state = {
          messages: [],
          view: firstView,
          currentRoomId,
          //userId: '1',
          roomList: [],
          roomObj: {},
      };
  }
  changeView(view) {
    // clear existing socket listeners, set localStorage
    // for help with view persistence, and set state to swap out components
    socket.off();
    const newStateObj = {view};
    console.log('Changing to view:', view);
    localStorage.setItem('lastView', view);
    // when entering the lobby, add a listener for newRoom events
    if (view === 'lobby') {
      socket.on('newRoom', newRoomObj => {
        const newStateObj = {roomList: this.state.roomList.concat(newRoomObj)};
        this.setState(newStateObj);
      });
    }
    this.setState(newStateObj);
  }
  addNewMessages(msgs) {
    const newStateObj = { messages: this.state.messages.concat(msgs)};
    this.setState(newStateObj);
  }
  addGotMessagesAndRoomData(data) {
    // Also make a socket connection!
    const newStateObj = { messages: data.msgs, roomObj: data.roomObj };
    this.setState(newStateObj);
  }
  addNewRooms(rooms) { // not being used?
    const newStateObj = { roomList: this.state.messages.concat(rooms)};
    this.setState(newStateObj);
  }
  addGotRooms(rooms) {
    const newStateObj = { roomList: rooms};
    this.setState(newStateObj);
  }
  joinRoom(roomObj) {
    if (moment(roomObj.expires) - moment() < 0) {
      this.changeView('lobby');
    }
    const newStateObj = { view: 'room', currentRoomId: roomObj._id, roomObj };
    localStorage.setItem('lastView', 'room');
    localStorage.setItem('lastRoom', roomObj._id);
    socket.off();
    socket.on(`${roomObj._id}`, (msg) => {
      console.log('socket msg received:', msg);
      this.addNewMessages(msg);
    });
    this.setState(newStateObj);
  }
  createRoom() { // use es6 fetch here? or jquery?
    const name = document.getElementById('create-room-name').value;
    const minsUntilExpiry = document.getElementById('create-room-lifetime').value;
    const expires = moment().add(minsUntilExpiry, 'minutes');
    console.log(`New Room Expires in ${minsUntilExpiry} minutes, which is at: ${expires}`);
    function error() {
      console.log('geolocation error');
    }
    navigator.geolocation.getCurrentPosition((position) => {
      console.log(position);
      const lat = position.coords.latitude;
      const long = position.coords.longitude
      const objToSend = {
        name,
        expires,
        lat,
        long,
      };
      const postReq = new XMLHttpRequest;
      postReq.addEventListener('load', () => {
        console.log('New Room Posted. Redirecting', postReq.responseText);
        const newRoomObj = JSON.parse(postReq.responseText);
        socket.emit('createRoom', newRoomObj);
        this.joinRoom(newRoomObj);
      });
      postReq.open("POST", HOST + 'createroom');
      postReq.setRequestHeader("Content-type", "application/json");
      postReq.send(JSON.stringify(objToSend));
    }, error);
  }
  /*leaveRoom(roomObj) {
    socket.removeListener(`${roomObj._id}`);
    this.changeView('lobby');
  }*/
  render() {
      if (this.state.view === 'room') {
        return <RoomView roomObj={this.state.roomObj} currentRoomId={this.state.currentRoomId} messages={this.state.messages} changeView={this.changeView.bind(this)} addGotMessagesAndRoomData={this.addGotMessagesAndRoomData.bind(this)} addNewMessages={this.addNewMessages.bind(this)}/>
      } else if (this.state.view === 'lobby') {
        return <Lobby roomList={this.state.roomList} addGotRooms={this.addGotRooms.bind(this)} joinRoom={this.joinRoom.bind(this)} changeView={this.changeView.bind(this)}/>
      } else if (this.state.view === 'createRoom') {
        return <RoomCreate createRoom={this.createRoom.bind(this)} changeView={this.changeView.bind(this)}/>
      } else {
        return <div><h1>View not found. Error in app.jsx App.render </h1></div>
      }
  }
}











render(<App />, document.getElementById('app'));
