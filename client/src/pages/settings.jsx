import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API_BASE_URL from "../config";
export default function SettingsPage() {
    const [formData, setFormData]=useState({});
    const [loading, setLoading]=useState(true);
    const navigate=useNavigate();
    useEffect(()=>{
       
      const fetchData=async()=>{

        try{
  
     const token = localStorage.getItem("token");
     const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
     method: "GET",
     headers: {
    "Authorization": `Bearer ${token}`,
    },
    });
    if (!response.ok){
          throw new Error("Failed to fetch user data");
        }

    const user = await response.json();
    setFormData(user);
    }catch(error){
      console.log("error in settings",error)
    }finally{
      setLoading(false);
    }
      }
      fetchData();
    },[])
   
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

const handleSubmit = async (e) => {
  e.preventDefault();

  const name = formData.name.trim();
  const currentPassword = formData.currentPassword?.trim(); 
  const newPassword = formData.newPassword?.trim();
  const confirmPassword = formData.confirmPassword?.trim();
  if (newPassword && newPassword !== confirmPassword) {
    alert("New passwords do not match!");
    return;
  }

  if (!name && !newPassword) {
    alert("No changes to update");
    return;
  }
  const payload = {};
  if (name) payload.name = name;
  if (newPassword) {
    payload.newPassword = newPassword;
    payload.currentPassword = currentPassword; 
  }
  setLoading(true);

  try {
    const token = localStorage.getItem("token");

    const response = await fetch(`${API_BASE_URL}/api/auth/update`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      alert("Profile updated successfully!");
      navigate('/allUsers');
      
    } else {
      console.error("Update failed:", data.message);
      alert(data.message || "Update failed");
    }
  } catch (error) {
    console.error("Request error:", error);
    alert("Something went wrong. Please try again.");
  } finally {
    setLoading(false);
  }
};

if(loading){
  return (
    <div>
      <h2>Loading..</h2>
    </div>
  )
}


  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-green-400 mb-6">Settings</h1>
          
          {/* User Avatar */}
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-green-600 rounded-full flex items-center justify-center">
              <span className="text-white text-2xl font-bold">
                {formData.name.charAt(0).toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        {/* Settings Form */}
        <div className="bg-gray-800 rounded-lg p-6 shadow-lg">
          {/* Name Field */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Name
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className="w-full p-3 rounded-lg bg-gray-700 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition duration-200"
              required
            />
          </div>

          {/* Email Field (Fixed) */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Email
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              className="w-full p-3 rounded-lg bg-gray-600 text-gray-400 border border-gray-500 cursor-not-allowed"
              disabled
              readOnly
            />
            <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
          </div>

          {/* Current Password  */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Current Password
            </label>
            <input
              type="password"
              name="currentPassword"
              value={formData.currentPassword}
               onChange={handleInputChange}
              className="w-full p-3 rounded-lg bg-gray-600 text-gray-400 border border-gray-500"
              placeholder="Enter current password"
              
            />
            <p className="text-xs text-gray-500 mt-1">Current password is protected</p>
          </div>

          {/* New Password Field */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              New Password
            </label>
            <input
              type="password"
              name="newPassword"
              value={formData.newPassword}
              onChange={handleInputChange}
              className="w-full p-3 rounded-lg bg-gray-700 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition duration-200"
              placeholder="Enter new password"
            />
          </div>

          {/* Confirm Password Field */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Confirm New Password
            </label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleInputChange}
              className="w-full p-3 rounded-lg bg-gray-700 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition duration-200"
              placeholder="Confirm new password"
            />
            {formData.newPassword && formData.confirmPassword && formData.newPassword !== formData.confirmPassword && (
              <p className="text-red-400 text-xs mt-1">Passwords do not match</p>
            )}
          </div>

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            disabled={loading || (formData.newPassword && formData.newPassword !== formData.confirmPassword)}
            className={`w-full py-3 px-6 rounded-lg font-semibold text-white transition duration-200 ${
              loading || (formData.newPassword && formData.newPassword !== formData.confirmPassword)
                ? 'bg-gray-600 cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-700 hover:shadow-lg active:scale-[0.98]'
            }`}
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving Changes...
              </span>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>

        {/* Additional Info */}
        <div className="mt-6 text-center text-gray-400 text-sm">
          <p>Your data is encrypted and secure</p>
        </div>
      </div>
    </div>
  );
}