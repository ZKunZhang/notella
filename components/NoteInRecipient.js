import { useContext } from "react";
import { NotesContext } from "../context/NotesContext";
import { LayoutContext } from "../context/LayoutContext";

export default function NoteInRecipient({ id, title, tags = [] }) {
  const { darkMode } = useContext(LayoutContext);
  const { handleClickNoteInRecipient } = useContext(NotesContext);

  const noteThemeFigure = darkMode
    ? "border-gray-700 hover:bg-blue-900"
    : "border-gray-300 hover:bg-gray-300";

  const noteTitleTheme = darkMode ? "text-white" : "";

  return (
    <>
      <figure
        onClick={() => handleClickNoteInRecipient(id)}
        className={`noteInRecipient ease-in-out duration-100 flex flex-col p-2 border-b ${noteThemeFigure} cursor-pointer`}
      >
        <h1 className={`${noteTitleTheme} font-bold`}>
          {title ? title : "Untitled note"}
        </h1>

        {/* 标签显示 */}
        {tags && tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1 mb-1">
            {tags.slice(0, 3).map((tag, index) => (
              <span
                key={index}
                className={`inline-block px-2 py-0.5 text-xs rounded-full ${
                  darkMode
                    ? "bg-blue-900 text-blue-200"
                    : "bg-blue-100 text-blue-700"
                }`}
              >
                {tag}
              </span>
            ))}
            {tags.length > 3 && (
              <span
                className={`inline-block px-2 py-0.5 text-xs ${
                  darkMode ? "text-gray-400" : "text-gray-500"
                }`}
              >
                +{tags.length - 3}
              </span>
            )}
          </div>
        )}

        <p
          className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}
        >
          Click edit or preview...
        </p>
      </figure>
    </>
  );
}
