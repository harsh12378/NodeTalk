import API_BASE_URL from "../config";
import { useState, useEffect } from "react";

import Requests from "../components/pendingRequests"
export default function Home(){

const [requests,setRequests]=useState([]);
const [loading,setLoading]=useState(false);

useEffect(()=>{
    const fetchRequests= async()=>{

           setLoading(true);
           const token=localStorage.getItem('token')
           const response= await fetch(`${API_BASE_URL}/api/users/requestlist`,{
            method: 'GET',
            headers: {
                "Content-Type": "application/json",
               "Authorization": `Bearer ${token}`,
            }
           })
           const data= await response.json();
           if(response.status===200){
            setRequests(data.requests);

           }else{
            console.log("error in fetching requests",response);
           }
           setLoading(false);
    }
    fetchRequests();
},[]);



const removeRequest=(id)=>{
   setRequests((prev=>prev.filter(req=>req._id!==id)));
}


return(
    <div className="min-h-screen bg-gray-900 ">
      <div className="bg-gray-800 p-2 py-3 border-b border-gray-500/40">
  <h3 className={`text-xl md:text-2xl font-medium mb-6 text-center tracking-wide drop-shadow-sm 
    ${requests.length === 0 ? 'text-emerald-300' : 'text-yellow-400'}`}>
    {requests.length === 0 ? 'No Pending Requests' : 'Pending Requests'}
  </h3>
  </div>
  {requests.map((request) => (
    <Requests key={request._id} request={request} onUpdate={removeRequest} />
  ))}
</div>
)
}