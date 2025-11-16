import { createContext, useEffect, useContext, useState } from "react";
import { LayoutContext } from "./LayoutContext";
import axios from "axios";
import { nanoid } from "nanoid";

export const NotesContext = createContext();

export const NotesProvider = ({ children, notes, trashedNotes }) => {
  const { panelIsActive, setPanelIsActive, windowWidth } =
    useContext(LayoutContext);

  const [userNotes, setUserNotes] = useState(notes);
  const [userTrashedNotes, setUserTrashedNotes] = useState(trashedNotes);

  const [searchValue, setSearchValue] = useState("");
  const [selectedTag, setSelectedTag] = useState(null); // 新增：标签筛选状态
  const [filteredNotes, setFilteredNotes] = useState([]);

  const [currentEditingNote, setCurrentEditingNote] = useState(null);
  const [viewTrashedNotes, setViewTrashedNotes] = useState(false);
  const [updatedNotes, setUpdatedNotes] = useState(false);

  // 修改：增强的搜索和筛选逻辑，支持标题+标签匹配
  useEffect(() => {
    const filterNotesBySearchAndTag = () => {
      // 选择笔记源
      let results = viewTrashedNotes ? [...userTrashedNotes] : [...userNotes];

      // 应用标签筛选
      if (selectedTag) {
        results = results.filter(
          (note) =>
            note.tags &&
            Array.isArray(note.tags) &&
            note.tags.includes(selectedTag)
        );
      }

      // 应用搜索筛选（同时匹配标题和标签）
      if (searchValue) {
        results = results.filter((note) => {
          // 标题匹配
          const titleMatch =
            note.title === searchValue || note.title.includes(searchValue);

          // 标签匹配
          const tagMatch =
            note.tags &&
            Array.isArray(note.tags) &&
            note.tags.some((tag) => tag.includes(searchValue));

          return titleMatch || tagMatch;
        });
      }

      setFilteredNotes(results);
    };

    filterNotesBySearchAndTag();
  }, [searchValue, selectedTag, viewTrashedNotes, userNotes, userTrashedNotes]);

  useEffect(() => {
    const updateNotes = async () => {
      const data = { notes: userNotes, trashedNotes: userTrashedNotes };
      try {
        const res = await axios.put("/api/account/notes", data);
        setUpdatedNotes(true);

        setTimeout(() => {
          setUpdatedNotes(false);
        }, 2500);
      } catch (error) {
        console.log(error);
      }
    };

    const timer = setTimeout(() => {
      updateNotes();
    }, 1000);

    return () => clearInterval(timer);
  }, [userNotes, userTrashedNotes]);

  useEffect(() => {
    setCurrentEditingNote(null);
    setSelectedTag(null); // 切换视图时清除标签筛选
  }, [viewTrashedNotes]);

  const addNewNote = () => {
    if (viewTrashedNotes) {
      setViewTrashedNotes(false);
    }

    const newNote = {
      id: nanoid(),
      title: "Untitled note",
      body: "Content goes here",
      tags: [], // 新增：初始化空标签数组
    };

    // Append new note at the beginning
    setUserNotes([newNote, ...userNotes]);
  };

  const deleteNote = (id) => {
    const index = userNotes.findIndex((note) => note.id === id);
    const newUserNotes = [...userNotes];
    newUserNotes.splice(index, 1);

    setUserNotes(newUserNotes);
  };

  const handleClickNoteInRecipient = (id) => {
    let clickedNote;
    if (windowWidth < 1024) {
      if (panelIsActive) {
        setPanelIsActive(false);
      }
    }

    if (viewTrashedNotes) {
      clickedNote = userTrashedNotes.find((note) => note.id === id);
    } else {
      clickedNote = userNotes.find((note) => note.id === id);
    }

    setCurrentEditingNote(clickedNote);
  };

  const handleOnChangeCurrentEditingNote = (e, id) => {
    const { target } = e;
    const { name, value } = target;

    const index = userNotes.findIndex((note) => note.id === id);
    let copiedNote = Object.assign({}, userNotes[index]);
    copiedNote[name] = value;

    const copiedNotes = [...userNotes];
    copiedNotes.splice(index, 1, copiedNote);

    setCurrentEditingNote(copiedNote);
    setUserNotes(copiedNotes);
  };

  const handleDeleteCurrentEditingNote = () => {
    const copiedCurrentEditingNote = { ...currentEditingNote };
    setCurrentEditingNote(null);

    const index = userNotes.findIndex(
      (note) => note.id === copiedCurrentEditingNote.id
    );

    const updatedUserNotes = [...userNotes];
    const [removed] = updatedUserNotes.splice(index, 1);

    const newTrashedNotes = [...userTrashedNotes];
    newTrashedNotes.push(removed);

    setUserNotes(updatedUserNotes);
    setUserTrashedNotes(newTrashedNotes);
  };

  const handleRemoveNoteFromTrash = (id) => {
    setCurrentEditingNote(null);
    const index = userTrashedNotes.findIndex((note) => note.id === id);

    const newTrashedNotes = [...userTrashedNotes];
    const [removed] = newTrashedNotes.splice(index, 1);

    setUserTrashedNotes(newTrashedNotes);
    setUserNotes([...userNotes, removed]);
  };

  const handleDeleteNoteFromTrash = () => {
    const copiedCurrentEditingNote = { ...currentEditingNote };
    setCurrentEditingNote(null);
    const index = userTrashedNotes.findIndex(
      (note) => note.id === copiedCurrentEditingNote.id
    );
    const updatedTrashedNotes = [...userTrashedNotes];
    updatedTrashedNotes.splice(index, 1);
    setUserTrashedNotes(updatedTrashedNotes);
  };

  // 新增：处理标签变更
  const handleTagsChange = (tags, id) => {
    const index = userNotes.findIndex((note) => note.id === id);
    if (index === -1) return;

    let copiedNote = Object.assign({}, userNotes[index]);
    copiedNote.tags = tags;

    const copiedNotes = [...userNotes];
    copiedNotes.splice(index, 1, copiedNote);

    setCurrentEditingNote(copiedNote);
    setUserNotes(copiedNotes);
  };

  return (
    <>
      <NotesContext.Provider
        value={{
          userNotes,
          userTrashedNotes,
          addNewNote,
          deleteNote,
          viewTrashedNotes,
          setViewTrashedNotes,
          handleClickNoteInRecipient,
          currentEditingNote,
          handleOnChangeCurrentEditingNote,
          handleDeleteCurrentEditingNote,
          handleRemoveNoteFromTrash,
          handleDeleteNoteFromTrash,
          searchValue,
          setSearchValue,
          filteredNotes,
          updatedNotes,
          selectedTag, // 新增
          setSelectedTag, // 新增
          handleTagsChange, // 新增
        }}
      >
        {children}
      </NotesContext.Provider>
    </>
  );
};
