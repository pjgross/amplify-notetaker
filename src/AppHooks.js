import React, { useState, useEffect } from 'react'
import { withAuthenticator } from 'aws-amplify-react'
import { API, graphqlOperation } from "aws-amplify"
import { createNote, deleteNote, updateNote } from './graphql/mutations'
import { listNotes } from './graphql/queries'
import { onCreateNote, onDeleteNote, onUpdateNote } from './graphql/subscriptions'

const App = () => {
  const [id, setId] = useState("")
  const [note, setNote] = useState("")
  const [notes, setNotes] = useState([])

  useEffect(() => {
    // load the notes from the graphql api
    getNotes()
    // setup a subscriptions with the graphql api to be notfied of any actions we are interested in
    const createNoteListener = API.graphql(graphqlOperation(onCreateNote)).subscribe({
      // next: provides us with the data associated with the new note
      next: noteData => {
        const newNote = noteData.value.data.onCreateNote
        setNotes(prevNotes => {
          const oldNotes = prevNotes.filter(note => note.id !== newNote.id)
          const updatedNotes = [...oldNotes, newNote]
          return updatedNotes
        })
        setNote("")
      }
    })
    const deleteNoteListener = API.graphql(graphqlOperation(onDeleteNote)).subscribe({
      next: noteData => {
        const deletedNote = noteData.value.data.onDeleteNote
        setNotes(prevNotes => {
          const updatedNotes = prevNotes.filter(item => item.id !== deletedNote.id)
          return updatedNotes
        })
      }
    })
    const updateNoteListener = API.graphql(graphqlOperation(onUpdateNote)).subscribe({
      next: noteData => {
        const updatedNote = noteData.value.data.onUpdateNote
        setNotes(prevNotes => {
          const index = prevNotes.findIndex(note => note.id === updatedNote.id)
          const updatedNotes = [
            ...prevNotes.slice(0, index),
            updatedNote,
            ...prevNotes.slice(index + 1)
          ]
          return updatedNotes
        })
        setNote("")
        setId("")
      }
    })
    return () => {
      createNoteListener.unsubscribe()
      deleteNoteListener.unsubscribe()
      updateNoteListener.unsubscribe()    
    }
  }, [])

  // a function that returns tue if we are editting an existing note based on id state
  const hasExistingNote = () => {
    if (id) {
      const isNote = notes.findIndex(note => note.id === id) > -1
      return isNote
    }
    return false

  }

  // load the notes from the dynamodb table
  const getNotes = async () => {
    const result = await API.graphql(graphqlOperation(listNotes))
    const notes = result.data.listNotes.items
    setNotes(notes)  
  }

  // add a note to the database, the subscription will handle the component update for new notes
  const handleAddNote = async event => {
    event.preventDefault()
    // check to see whether it is a new note or existing
    if (hasExistingNote()) {
      handleUpdateNote()
    } else {
      const input = { note }
      await API.graphql(graphqlOperation(createNote, { input }))
    }
  }

  // handle updating an existing note
  const handleUpdateNote = async () => {
    const input = { id, note}
    await API.graphql(graphqlOperation(updateNote, { input }))
    // reset the state
    setNote("")
    setId("")
  }

  const handleDeleteNote = async (noteId) => {
    const input = { id: noteId }
    await API.graphql(graphqlOperation(deleteNote, { input }))
  }

  // used to keep state inline with the test value
  const handleChangeNote = (event) => {
    setNote(event.target.value )
  }

  // change the state to the click on item
  const handleSetNote = ({ note, id }) => {
    setNote(note)
    setId(id)
  }


    return (
      <div className="flex flex-column items-center justify-center pa3 bg-washed-red">
        <h1 className="code f2-1">Amplify Notetaker</h1>
        <form onSubmit={handleAddNote} className="mb3">
          <input type="text" 
          className="pa2 f4" 
          placeholder="Write your note"
          onChange={handleChangeNote}
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
              <li onClick={() => handleSetNote(item)} className="list pa1 f3">
                {item.note}
              </li>
              <button onClick={() => handleDeleteNote(item.id)} className="bg-transparent bn f4">
                <span>&times;</span>
              </button>

            </div>
          ))}
        </div>
      </div>
    )
  }
// wrapping our component with the awsd authentication against cognito
// include greetings added the signout button to the header
export default withAuthenticator(App, { includeGreetings: true })
