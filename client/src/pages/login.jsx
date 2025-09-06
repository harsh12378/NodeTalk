import  { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import API_BASE_URL from "../config";
export default function Login() {
  const [isLoading,setIsLoading]=useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
    const navigate = useNavigate();
  const handleLogin = async (e) => {
    setIsLoading(true);
    e.preventDefault();
    try {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();
    if(response.status===404){
      alert(" user not found");

    }
    else if(response.status===401){
      alert("Invalid credentials");
    }
    else{ 
      setIsLoading(false);
      localStorage.setItem('token', data.token);
       window.dispatchEvent(new Event("loginStatusChanged")); 
      navigate("/allusers");
    }

  } catch (error) {
    alert("some server error");
    console.error("Error logging in:", error);
  }

  
  };

 return (
<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-green-900 px-4">
  <div className="w-full max-w-md bg-gray-950 rounded-2xl shadow-2xl p-8 border border-green-700">
    <h2 className="text-3xl font-extrabold text-green-400 text-center mb-8 tracking-wide drop-shadow-lg">Login</h2>
    <form onSubmit={handleLogin} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full px-4 py-2 rounded-lg bg-gray-800 text-green-200 border border-green-700 focus:outline-none focus:ring-2 focus:ring-green-400 placeholder-gray-500"
          placeholder="Enter your email"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full px-4 py-2 rounded-lg bg-gray-800 text-green-200 border border-green-700 focus:outline-none focus:ring-2 focus:ring-green-400 placeholder-gray-500"
          placeholder="Enter your password"
        />
      </div>
      <button         
       type="submit"         
       className="w-full py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition duration-200 shadow-md flex items-center justify-center"         
       disabled={isLoading}       
       >         
      {isLoading && (          
    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>          
      )}         
  {isLoading ? 'Logging in...' : 'Login'}       
   </button>
      <div className="text-center mt-4">
        <span className="text-gray-400">Don't have an account?</span>
        <NavLink to="/signup" className="ml-2 text-green-400 hover:underline font-semibold">Sign Up</NavLink>
      </div>
    </form>
  </div>
</div>
);
}