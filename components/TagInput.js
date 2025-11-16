import { useState, useContext } from "react";
import { LayoutContext } from "../context/LayoutContext";

export default function TagInput({ tags = [], onChange, disabled = false }) {
  const { darkMode } = useContext(LayoutContext);
  const [inputValue, setInputValue] = useState("");

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
  };

  const handleInputKeyDown = (e) => {
    if (disabled) return;

    // 回车或逗号添加标签
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag();
    }
    // Backspace 删除最后一个标签（当输入框为空时）
    else if (e.key === "Backspace" && inputValue === "" && tags.length > 0) {
      removeTag(tags.length - 1);
    }
  };

  const handleInputBlur = () => {
    // 失去焦点时添加标签
    if (inputValue.trim()) {
      addTag();
    }
  };

  const addTag = () => {
    const trimmedValue = inputValue.trim().replace(/,/g, ""); // 移除逗号
    if (!trimmedValue) return;

    // 检查是否已存在（不区分大小写）
    const isDuplicate = tags.some(
      (tag) => tag.toLowerCase() === trimmedValue.toLowerCase()
    );

    if (!isDuplicate) {
      const newTags = [...tags, trimmedValue];
      onChange(newTags);
    }

    setInputValue("");
  };

  const removeTag = (index) => {
    if (disabled) return;
    const newTags = tags.filter((_, i) => i !== index);
    onChange(newTags);
  };

  return (
    <div className="tagInput w-full">
      {/* 标签容器 */}
      <div
        className={`flex flex-wrap gap-2 p-2 border rounded ${
          darkMode
            ? "bg-gray-800 border-gray-700"
            : "bg-white border-gray-300"
        }`}
      >
        {/* 已有标签 */}
        {tags.map((tag, index) => (
          <span
            key={index}
            className={`inline-flex items-center gap-1 px-2 py-1 text-sm rounded-full ${
              darkMode
                ? "bg-blue-900 text-blue-200"
                : "bg-blue-100 text-blue-800"
            }`}
          >
            <span>{tag}</span>
            {!disabled && (
              <button
                onClick={() => removeTag(index)}
                className={`hover:opacity-70 ${
                  darkMode ? "text-blue-300" : "text-blue-600"
                }`}
                title="Remove tag"
              >
                <i className="bi bi-x" />
              </button>
            )}
          </span>
        ))}

        {/* 输入框 */}
        {!disabled && (
          <input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleInputKeyDown}
            onBlur={handleInputBlur}
            placeholder={tags.length === 0 ? "Add tags (press Enter or ,)" : ""}
            className={`flex-1 min-w-[120px] outline-none border-none ${
              darkMode ? "text-white" : "text-gray-900"
            }`}
            style={{ background: "none" }}
          />
        )}
      </div>

      {/* 提示文本 */}
      {!disabled && (
        <p
          className={`mt-1 text-xs ${
            darkMode ? "text-gray-400" : "text-gray-500"
          }`}
        >
          Press Enter or comma to add tags
        </p>
      )}
    </div>
  );
}
