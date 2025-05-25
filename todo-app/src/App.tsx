import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Edit2, Trash2, Search, ArrowUpDown } from 'lucide-react';

// ステップ1: 型定義
interface Todo {
  ID: number;
  Title: string;
  Status: '未着手' | '進行中' | '完了';
  Priority: number;
}

interface TodoForm {
  Title: string;
  Status: '未着手' | '進行中' | '完了';
  Priority: number;
}

// ステップ2: Todoアプリのメインコンポーネント
const TodoApp = () => {
  // ステップ3: 状態管理（useState）
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [debugMode, setDebugMode] = useState<boolean>(true); // デバッグモード追加
  
  // 新規Todo作成用の状態
  const [newTodo, setNewTodo] = useState<TodoForm>({
    Title: '',
    Status: '未着手',
    Priority: 1
  });
  
  // 編集用の状態
  const [editingTodo, setEditingTodo] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<TodoForm>({
    Title: '',
    Status: '未着手',
    Priority: 1
  });
  
  // 検索用の状態
  const [searchTitle, setSearchTitle] = useState<string>('');
  const [sortByPriority, setSortByPriority] = useState<boolean>(false);

  // モックデータ
  const mockTodos = useMemo(() => [
    { ID: 1, Title: "テスト1", Status: "未着手", Priority: 2 },
    { ID: 2, Title: "テスト2", Status: "進行中", Priority: 1 },
    { ID: 3, Title: "テスト3", Status: "完了", Priority: 3 },
  ], []);

  // ステップ4: API通信関数の定義
  const API_BASE = 'http://localhost:8080/Todo';
  
  // Todo一覧を取得する関数
  const fetchTodos = useCallback(
  async (title: string = '', sorted: boolean = false): Promise<void> => {
    setLoading(true);
    setError('');

    if (debugMode) {
      // (デバッグモードのロジックは変更なし)
      console.log('デバッグモード: モックデータを使用');
      setTimeout(() => {
        let filteredTodos = [...mockTodos];
        if (title) {
          filteredTodos = filteredTodos.filter(todo =>
            todo.Title.toLowerCase().includes(title.toLowerCase())
          );
        }
        if (sorted) {
          filteredTodos.sort((a, b) => a.Priority - b.Priority);
        }
        setTodos(filteredTodos as Todo[]);
        setLoading(false);
      }, 500);
      return;
    }

    try {
      let url = `${API_BASE}/list`;
      if (sorted) {
        url = `${API_BASE}/list/sorted`;
      } else if (title) {
        url = `${API_BASE}/list?Title=${encodeURIComponent(title)}`;
      }

      console.log('APIリクエスト URL:', url);
      const response = await fetch(url);
      console.log('レスポンス状態:', response.status);

      if (!response.ok) {
        let errorDetails = `HTTP error! status: ${response.status}`;
        try {
          const errorText = await response.text();
          errorDetails += `, body: ${errorText}`;
          console.error('エラーレスポンス:', errorText);
        } catch (e) { /* ignore */ }
        throw new Error(errorDetails);
      }

      const responseData = await response.json(); // APIからの生のレスポンスオブジェクト
      console.log('取得したAPIレスポンス (raw):', responseData);

      // APIのレスポンスが { list: [...] } という形式なので、data.list を使用する
      if (responseData) {
        if (Array.isArray(responseData.list)) {
          // 通常のリスト取得やタイトル検索の場合 ({ list: [...] })
          setTodos(responseData.list);
        } else if (Array.isArray(responseData.sortedList)) {
          // ソート済みリスト取得の場合 ({ sortedList: [...] })
          setTodos(responseData.sortedList);
        } else {
          // どちらの形式でもない場合
          console.warn('Todoリストの取得に失敗したか、期待するデータ形式ではありません (list も sortedList も配列ではない)。', responseData);
          setTodos([]);
          setError('サーバーから取得したTodoリストの形式が正しくありません。');
        }
      } else {
        // responseData が null や undefined の場合 (通常は response.ok であれば発生しにくい)
        console.warn('APIからのレスポンスデータがありません (null または undefined)。', responseData);
        setTodos([]);
        setError('サーバーから有効なデータを受信できませんでした。');
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(`取得エラー: ${errorMessage}`);
      console.error('Fetch error details:', err);
      setTodos([]);
    } finally {
      setLoading(false);
    }
  },
  // 依存配列には API_BASE, mockTodos に加えて、状態更新関数も必要です
  [debugMode, API_BASE, mockTodos, setTodos, setLoading, setError]
);
  
  // 新しいTodoを追加する関数
  const addTodo = async (): Promise<void> => {
    if (!newTodo.Title.trim()) {
      setError('Todoタイトルを入力してください');
      return;
    }
    
    setLoading(true);
    setError('');
    
    if (debugMode) {
      // デバッグモード: モックでTodo追加
      setTimeout(() => {
        const newId = Math.max(...todos.map(t => t.ID), 0) + 1;
        const todoToAdd: Todo = {
          ID: newId,
          Title: newTodo.Title,
          Status: newTodo.Status,
          Priority: newTodo.Priority
        };
        setTodos(prev => [...prev, todoToAdd]);
        setNewTodo({ Title: '', Status: '未着手', Priority: 1 });
        setLoading(false);
      }, 300);
      return;
    }
    
    try {
      const url = `${API_BASE}/add?Title=${encodeURIComponent(newTodo.Title)}&Status=${encodeURIComponent(newTodo.Status)}&Priority=${newTodo.Priority}`;
      
      const response = await fetch(url, {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      // 追加成功後、フォームをリセットして一覧を再取得
      setNewTodo({ Title: '', Status: '未着手', Priority: 1 });
      await fetchTodos(searchTitle, sortByPriority);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(`追加エラー: ${errorMessage}`);
      console.error('Add error:', err);
    } finally {
      setLoading(false);
    }
  };
  
  // Todoを更新する関数
  const updateTodo = async (id: number): Promise<void> => {
    if (!editForm.Title.trim()) {
      setError('Todoタイトルを入力してください');
      return;
    }
    
    setLoading(true);
    setError('');
    
    if (debugMode) {
      // デバッグモード: モックで更新
      setTimeout(() => {
        setTodos(prev => prev.map(todo => 
          todo.ID === id 
            ? { ...todo, Title: editForm.Title, Status: editForm.Status, Priority: editForm.Priority }
            : todo
        ));
        setEditingTodo(null);
        setLoading(false);
      }, 300);
      return;
    }
    
    try {
      const url = `${API_BASE}/update?ID=${id}&Title=${encodeURIComponent(editForm.Title)}&Status=${encodeURIComponent(editForm.Status)}&Priority=${editForm.Priority}`;
      
      const response = await fetch(url, {
        method: 'PUT'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      // 更新成功後、編集モードを終了して一覧を再取得
      setEditingTodo(null);
      await fetchTodos(searchTitle, sortByPriority);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(`更新エラー: ${errorMessage}`);
      console.error('Update error:', err);
    } finally {
      setLoading(false);
    }
  };
  
  // Todoを削除する関数
  const deleteTodo = async (id: number): Promise<void> => {
    if (!window.confirm('本当に削除しますか？')) {
      return;
    }
    
    setLoading(true);
    setError('');
    
    if (debugMode) {
      // デバッグモード: モックで削除
      setTimeout(() => {
        setTodos(prev => prev.filter(todo => todo.ID !== id));
        setLoading(false);
      }, 300);
      return;
    }
    
    try {
      const response = await fetch(`${API_BASE}/delete?id=${id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      // 削除成功後、一覧を再取得
      await fetchTodos(searchTitle, sortByPriority);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(`削除エラー: ${errorMessage}`);
      console.error('Delete error:', err);
    } finally {
      setLoading(false);
    }
  };

  // ステップ5: 副作用（useEffect）- コンポーネントマウント時に一覧取得
  useEffect(() => {
    fetchTodos();
  }, [fetchTodos]);

  // ステップ6: イベントハンドラー関数
  const handleSearch = (): void => {
    fetchTodos(searchTitle, sortByPriority);
  };
  
  const handleToggleSort = (): void => {
    const newSortState = !sortByPriority;
    setSortByPriority(newSortState);
    fetchTodos(searchTitle, newSortState);
  };
  
  const startEdit = (todo: Todo): void => {
    setEditingTodo(todo.ID);
    setEditForm({
      Title: todo.Title,
      Status: todo.Status,
      Priority: todo.Priority
    });
  };
  
  const cancelEdit = (): void => {
    setEditingTodo(null);
    setEditForm({ Title: '', Status: '未着手', Priority: 1 });
  };

  // ステップ7: JSXの描画
  return (
    <div className="max-w-4xl mx-auto p-6 bg-gray-50 min-h-screen">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-8 text-center">
          📝 React Todo アプリ
        </h1>
        
        {/* デバッグモード切り替え */}
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={debugMode}
              onChange={(e) => setDebugMode(e.target.checked)}
              className="mr-2"
            />
            <span className="text-sm font-medium text-yellow-800">
              デバッグモード（モックデータを使用）
            </span>
          </label>
          {!debugMode && (
            <p className="text-xs text-yellow-700 mt-1">
              API接続: {API_BASE}
            </p>
          )}
        </div>
        
        {/* エラー表示 */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        
        {/* 新規Todo追加フォーム */}
        <div className="bg-blue-50 p-4 rounded-lg mb-6">
          <h2 className="text-xl font-semibold mb-4 text-blue-800">📝 新しいTodo</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                タイトル
              </label>
              <input
                type="text"
                value={newTodo.Title}
                onChange={(e) => setNewTodo({...newTodo, Title: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Todoを入力..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ステータス
              </label>
              <select
                value={newTodo.Status}
                onChange={(e) => setNewTodo({...newTodo, Status: e.target.value as '未着手' | '進行中' | '完了'})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="未着手">未着手</option>
                <option value="進行中">進行中</option>
                <option value="完了">完了</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                優先度
              </label>
              <input
                type="number"
                min="1"
                value={newTodo.Priority}
                onChange={(e) => setNewTodo({...newTodo, Priority: parseInt(e.target.value) || 1})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={addTodo}
                disabled={loading}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400 flex items-center justify-center"
              >
                <Plus className="w-4 h-4 mr-2" />
                追加
              </button>
            </div>
          </div>
        </div>
        
        {/* 検索・ソート */}
        <div className="bg-gray-50 p-4 rounded-lg mb-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">🔍 検索・ソート</h2>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                value={searchTitle}
                onChange={(e) => setSearchTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="タイトルで検索..."
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={loading}
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:bg-gray-400 flex items-center justify-center"
            >
              <Search className="w-4 h-4 mr-2" />
              検索
            </button>
            <button
              onClick={handleToggleSort}
              disabled={loading}
              className={`px-4 py-2 rounded-md flex items-center justify-center ${
                sortByPriority 
                  ? 'bg-orange-600 text-white hover:bg-orange-700' 
                  : 'bg-gray-600 text-white hover:bg-gray-700'
              } disabled:bg-gray-400`}
            >
              <ArrowUpDown className="w-4 h-4 mr-2" />
              {sortByPriority ? '優先度順' : '通常順'}
            </button>
          </div>
        </div>
        
        {/* ローディング表示 */}
        {loading && (
          <div className="text-center py-4">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600">読み込み中...</p>
          </div>
        )}
        
        {/* Todo一覧 */}
        <div className="space-y-3">
          <h2 className="text-xl font-semibold text-gray-800">📋 Todo一覧 ({todos.length}件)</h2>
          {todos.length === 0 && !loading ? (
            <p className="text-gray-500 text-center py-8">Todoがありません</p>
          ) : (
            todos.map((todo) => (
              <div key={todo.ID} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                {editingTodo === todo.ID ? (
                  // 編集モード
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                    <input
                      type="text"
                      value={editForm.Title}
                      onChange={(e) => setEditForm({...editForm, Title: e.target.value})}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <select
                      value={editForm.Status}
                      onChange={(e) => setEditForm({...editForm, Status: e.target.value as '未着手' | '進行中' | '完了'})}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="未着手">未着手</option>
                      <option value="進行中">進行中</option>
                      <option value="完了">完了</option>
                    </select>
                    <input
                      type="number"
                      min="1"
                      value={editForm.Priority}
                      onChange={(e) => setEditForm({...editForm, Priority: parseInt(e.target.value) || 1})}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={() => updateTodo(todo.ID)}
                      disabled={loading}
                      className="bg-green-600 text-white px-3 py-2 rounded-md hover:bg-green-700 disabled:bg-gray-400"
                    >
                      保存
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="bg-gray-600 text-white px-3 py-2 rounded-md hover:bg-gray-700"
                    >
                      キャンセル
                    </button>
                  </div>
                ) : (
                  // 表示モード
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-4">
                        <h3 className="text-lg font-medium text-gray-800">{todo.Title}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          todo.Status === '完了' ? 'bg-green-100 text-green-800' :
                          todo.Status === '進行中' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {todo.Status}
                        </span>
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                          優先度: {todo.Priority}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">ID: {todo.ID}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => startEdit(todo)}
                        className="bg-blue-600 text-white px-3 py-2 rounded-md hover:bg-blue-700 flex items-center"
                      >
                        <Edit2 className="w-4 h-4 mr-1" />
                        編集
                      </button>
                      <button
                        onClick={() => deleteTodo(todo.ID)}
                        disabled={loading}
                        className="bg-red-600 text-white px-3 py-2 rounded-md hover:bg-red-700 disabled:bg-gray-400 flex items-center"
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        削除
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default TodoApp;