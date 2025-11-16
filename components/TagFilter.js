import { useContext, useMemo } from "react";
import { NotesContext } from "../context/NotesContext";
import { LayoutContext } from "../context/LayoutContext";

export default function TagFilter() {
  const { userNotes, userTrashedNotes, viewTrashedNotes, selectedTag, setSelectedTag } =
    useContext(NotesContext);
  const { darkMode } = useContext(LayoutContext);

  // 计算所有唯一标签及其笔记数量
  const tagCounts = useMemo(() => {
    const notes = viewTrashedNotes ? userTrashedNotes : userNotes;
    const counts = {};

    notes.forEach((note) => {
      if (note.tags && Array.isArray(note.tags)) {
        note.tags.forEach((tag) => {
          counts[tag] = (counts[tag] || 0) + 1;
        });
      }
    });

    // 转换为数组并按笔记数量降序排序
    return Object.entries(counts)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count);
  }, [userNotes, userTrashedNotes, viewTrashedNotes]);

  const handleTagClick = (tag) => {
    // 如果点击的是当前选中的标签，则取消筛选
    if (selectedTag === tag) {
      setSelectedTag(null);
    } else {
      setSelectedTag(tag);
    }
  };

  const handleClearFilter = () => {
    setSelectedTag(null);
  };

  if (tagCounts.length === 0) {
    return null; // 没有标签时不显示
  }

  return (
    <div
      className={`tagFilter p-3 border-b ${
        darkMode ? "border-gray-700" : "border-gray-300"
      }`}
    >
      {/* 标题行 */}
      <div className="flex items-center justify-between mb-2">
        <h3
          className={`text-sm font-semibold ${
            darkMode ? "text-gray-300" : "text-gray-700"
          }`}
        >
          Filter by Tags
        </h3>
        {selectedTag && (
          <button
            onClick={handleClearFilter}
            className={`text-xs ${
              darkMode
                ? "text-blue-400 hover:text-blue-300"
                : "text-blue-600 hover:text-blue-700"
            }`}
          >
            Clear
          </button>
        )}
      </div>

      {/* 标签列表 */}
      <div className="flex flex-wrap gap-2">
        {tagCounts.map(({ tag, count }) => {
          const isSelected = selectedTag === tag;
          return (
            <button
              key={tag}
              onClick={() => handleTagClick(tag)}
              className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full transition-colors ${
                isSelected
                  ? darkMode
                    ? "bg-blue-600 text-white"
                    : "bg-blue-500 text-white"
                  : darkMode
                  ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
              title={`${count} note${count > 1 ? "s" : ""}`}
            >
              <span>{tag}</span>
              <span
                className={`text-xs ${
                  isSelected
                    ? darkMode
                      ? "text-blue-200"
                      : "text-blue-100"
                    : darkMode
                    ? "text-gray-400"
                    : "text-gray-500"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
