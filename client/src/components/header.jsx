import { useState } from "react";
import { NavLink ,useLocation,useNavigate} from "react-router-dom";
import { useEffect } from "react";
export default function Header() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [query, setQuery] = useState("");
  const location = useLocation();
  const [activeTab, setActiveTab] = useState("users");


  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Search query:", query);
    // Add your search logic here
  };
   const navigate=useNavigate();
  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/');
  };

  const handleSettings = () => {
     navigate('/settings');
  };


  return (
  <div className=" w-full bg-gray-800 p-0 m-0 border-b-2 border-green-700">
      {/* Header */}
  <div className="w-full bg-gray-900 text-green-500 px-4 py-2 shadow-xl m-0">
  <div className="flex items-center justify-between w-full px-2 py-2 rounded shadow-md bg-gray-900">
          <button
            className="flex flex-col justify-center items-center w-8 h-8 space-y-1 focus:outline-none"
            onClick={toggleSidebar}
            aria-label="Toggle menu"
          >
            <span className="w-6 h-0.5 bg-green-500"></span>
            <span className="w-6 h-0.5 bg-green-500"></span>
            <span className="w-6 h-0.5 bg-green-500"></span>
          </button>

          <h1 className="text-2xl font-bold tracking-wide text-center w-full">NodeTalk</h1>
        </div>
      </div>

      {/* Search Section */}
  <div className="w-full bg-gray-800 px-4 py-3 m-0">
        <form className="flex items-center space-x-2 justify-center" onSubmit={handleSubmit}>
          <input
            className="px-4 py-2 rounded bg-gray-700 text-green-400 placeholder-green-600 focus:outline-none focus:ring-2 focus:ring-green-700 w-full max-w-md"
            type="text"
            placeholder="Search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
            type="submit"
          >
            🔍
          </button>
        </form>
      </div>

      {/* Navigation Tabs */}
  <div className="w-full bg-gray-800 py-0 px-0 m-0">

<nav className="flex justify-center space-x-8">
  <NavLink
    to="/allUsers"
    className={({ isActive }) =>
      `pb-1 text-lg font-medium transition-colors ${
        isActive
          ? "text-green-400 border-b-2 border-green-600"
          : "text-green-200 hover:text-green-600"
      }`
    }
  >
    All Users
  </NavLink>

  <NavLink
    to="/friends"
    className={({ isActive }) =>
      `pb-1 text-lg font-medium transition-colors ${
        isActive
          ? "text-green-400 border-b-2 border-green-600"
          : "text-green-200 hover:text-green-600"
      }`
    }
  >
    Friends
  </NavLink>
  <NavLink
    to="/pendingrequests"
    className={({ isActive }) =>
      `pb-1 text-lg font-medium transition-colors ${
        isActive
          ? "text-green-400 border-b-2 border-green-600"
          : "text-green-200 hover:text-green-600"
      }`
    }
  >
    Requests
  </NavLink>
</nav>
      </div>

      {/* Sidebar */}
      <div
        className={`fixed top-0 left-0 h-full w-64 bg-gray-950 text-green-50 z-50 shadow-lg transform transition-transform duration-300 ease-in-out ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl text-green-500 font-semibold">Menu</h2>
            <button
              className="text-2xl text-green-300 hover:text-green-500 transition-transform duration-200 hover:scale-110"
              onClick={toggleSidebar}
              aria-label="Close menu"
            >
              ×
            </button>
          </div>

          <nav>
            <ul className="space-y-4">
              <li>
                <button
                 
                  onClick={() => {navigate('/allUsers');
                   setIsSidebarOpen(false);}}
                  className="block hover:text-green-500 transition-transform duration-200 hover:translate-x-1"
                >
                  All Users
                </button>
              </li>
              <li>
                <button
                  onClick={() => {navigate('/friends');
                   setIsSidebarOpen(false);}}
                  className="block hover:text-green-500 transition-transform duration-200 hover:translate-x-1"
                >
                  Friends
                </button>
              </li>
               <li>
                <button
                 onClick={() => {navigate('/pendingrequests');
                   setIsSidebarOpen(false);}}
                  className="block hover:text-green-400 transition-transform duration-200 hover:translate-x-1"
                >
                  Requests
                </button>
              </li>
              <li>
                <button
                 href="/settings"
                  className="w-full text-left hover:text-green-400 transition-transform duration-200 hover:translate-x-1"
                  onClick={handleSettings}
                >
                  ⚙️ Settings
                </button>
              </li>
              <li>
                <button
                  className="w-full text-left hover:text-green-400 transition-transform duration-200 hover:translate-x-1"
                  onClick={handleLogout}
                >
                  🚪 Logout
                </button>
              </li>
            </ul>
          </nav>
        </div>
      </div>

      {/* Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={toggleSidebar}
        ></div>
      )}
    </div>
  );
}