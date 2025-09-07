import  { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import API_BASE_URL from "../config";
import { useGoogleLogin } from "@react-oauth/google";
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
    const handleGoogleSubmit = useGoogleLogin({
       onSuccess: async (tokenResponse) => {  
       const response = await fetch(`${API_BASE_URL}/api/auth/googleAuth`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ access_token: tokenResponse.access_token }),
      });
        setIsLoading(true);
      const data = await response.json();
      if(response.ok){
        setIsLoading(false);
      localStorage.setItem("token",data.token);
        navigate("/allusers");
      }else{
        alert("some server error");
      }
    },
     onError: (err) => console.log("Login Failed", err),
    });

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
     {/* OR Divider */}
      <div className="flex items-center my-6">
        <div className="flex-grow border-t border-green-700"></div>
        <span className="px-4 text-gray-400 font-medium">OR</span>
        <div className="flex-grow border-t border-green-700"></div>
      </div>
      
      {/* Google Sign In Button */}
      <div className="flex justify-center">
        <button
          className="flex items-center gap-2 px-6 py-2 bg-white text-green-700 font-semibold rounded-lg shadow hover:bg-green-50 border border-green-400 transition duration-200"
          type="button"
          onClick={() => {
         setIsLoading(true);
        handleGoogleSubmit();
         }}

        >
          <svg className="w-5 h-5" viewBox="0 0 48 48">
            <g>
              <path fill="#4285F4" d="M44.5 20H24v8.5h11.7C34.7 33.1 29.8 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c2.7 0 5.2.9 7.2 2.5l6.4-6.4C33.5 5.1 28.1 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21c10.5 0 20-8.1 20-21 0-1.3-.1-2.7-.5-4z"/>
              <path fill="#34A853" d="M6.3 14.7l7 5.1C15.5 16.1 19.4 13 24 13c2.7 0 5.2.9 7.2 2.5l6.4-6.4C33.5 5.1 28.1 3 24 3c-7.2 0-13.4 3.1-17.7 8.1z"/>
              <path fill="#FBBC05" d="M24 44c5.6 0 10.7-1.9 14.7-5.1l-6.8-5.6C29.8 38 27 39 24 39c-5.7 0-10.5-3.7-12.2-8.8l-7 5.4C7.9 40.7 15.4 44 24 44z"/>
              <path fill="#EA4335" d="M44.5 20H24v8.5h11.7c-1.2 3.2-4.7 7.5-11.7 7.5-6.6 0-12-5.4-12-12s5.4-12 12-12c2.7 0 5.2.9 7.2 2.5l6.4-6.4C33.5 5.1 28.1 3 24 3c-7.2 0-13.4 3.1-17.7 8.1z"/>
            </g>
          </svg>
          Continue with Google
        </button>
      </div>
  </div>
</div>
);
}