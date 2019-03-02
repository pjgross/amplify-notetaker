import React, { Component } from 'react'
import { withAuthenticator } from 'aws-amplify-react'
import { API, graphqlOperation } from "aws-amplify"
import { createNote, deleteNote, updateNote } from './graphql/mutations'
import { listNotes } from './graphql/queries'
import { onCreateNote, onDeleteNote, onUpdateNote } from './graphql/subscriptions'

class App extends Component {
  state = {
    id: "",
    note: '',
    notes: []
  }

  async componentDidMount() {
    // load the notes from the graphql api
    this.getNotes()
    // setup a subscriptions with the graphql api to be notfied of any actions we are interested in
    this.createNoteListener = API.graphql(graphqlOperation(onCreateNote)).subscribe({
      // next: provides us with the data associated with the new note
      next: noteData => {
        const newNote = noteData.value.data.onCreateNote
        const prevNotes = this.state.notes.filter(note => note.id !== newNote.id)
        const updatedNotes = [...prevNotes, newNote]
        this.setState({notes: updatedNotes})
      }
    })
    this.deleteNoteListener = API.graphql(graphqlOperation(onDeleteNote)).subscribe({
      next: noteData => {
        const deletedNote = noteData.value.data.onDeleteNote
        const updatedNotes = this.state.notes.filter(item => item.id !== deletedNote.id)
        this.setState({notes: updatedNotes})
      }
    })
    this.updateNoteListener = API.graphql(graphqlOperation(onUpdateNote)).subscribe({
      next: noteData => {
        const updatedNote = noteData.value.data.onUpdateNote
        const index = this.state.notes.findIndex(note => note.id === updatedNote.id)
        // update the state array
        const updatedNotes = [
          ...this.state.notes.slice(0, index),
          updatedNote,
          ...this.state.notes.slice(index + 1)
    ]
    // update the state
    this.setState({notes: updatedNotes})
      }
    })
  }

  componentWillUnmount() {
    // clean up any listeners we have setup
    this.createNoteListener.unsubscribe()
    this.deleteNoteListener.unsubscribe()
    this.updateNoteListener.unsubscribe()
  }

  // a function that returns tue if we are editting an existing note based on id state
  hasExistingNote = () => {
    const { notes, id} = this.state
    if (id) {
      const isNote = notes.findIndex(note => note.id === id) > -1
      return isNote
    }
    return false

  }

  // load the notes from the dynamodb table
  getNotes = async () => {
    const result = await API.graphql(graphqlOperation(listNotes))
    const notes = result.data.listNotes.items
    this.setState({ notes, note: ""})  
  }

  // add a note to the database, the subscription will handle the component update for new notes
  handleAddNote = async event => {
    const { note } = this.state
    event.preventDefault()
    // check to see whether it is a new note or existing
    if (this.hasExistingNote()) {
      this.handleUpdateNote()
    } else {
      const input = { note }
      await API.graphql(graphqlOperation(createNote, { input }))
      this.setState({ note: "" })
    }
  }

  // handle updating an existing note
  handleUpdateNote = async () => {
    const { id, note } = this.state
    const input = { id, note}
    await API.graphql(graphqlOperation(updateNote, { input }))
    // reset the state
    this.setState({ note: "", id: "" })
  }

  handleDeleteNote = async (noteId) => {
    const input = { id: noteId }
    await API.graphql(graphqlOperation(deleteNote, { input }))
  }

  // used to keep state inline with the test value
  handleChangeNote = (event) => {
    this.setState({ note: event.target.value })
  }

  // change the state to the click on item
  handleSetNote = ({ note, id }) => this.setState({ note, id})

  render() {
    const { notes, note, id } = this.state
    return (
      <div className="flex flex-column items-center justify-center pa3 bg-washed-red">
        <h1 className="code f2-1">Amplify Notetaker</h1>
        <form onSubmit={this.handleAddNote} className="mb3">
          <input type="text" 
          className="pa2 f4" 
          placeholder="Write your note"
          onChange={this.handleChangeNote}
          value={note}
          />
          <button className="pa2 f4"
          type="submit">
            {id ? "Update Note" : "Add Note" }
          </button>
        </form>
        <div>
          {notes.map(item => (
            <div key={item.id}
             className="flex items-center">
              <li onClick={() => this.handleSetNote(item)} className="list pa1 f3">
                {item.note}
              </li>
              <button onClick={() => this.handleDeleteNote(item.id)} className="bg-transparent bn f4">
                <span>&times;</span>
              </button>

            </div>
          ))}
        </div>
      </div>
    )
  }
}
// wrapping our component with the awsd authentication against cognito
// include greetings added the signout button to the header
export default withAuthenticator(App, { includeGreetings: true })
