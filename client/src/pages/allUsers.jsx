
import { useState, useEffect } from "react";
import User from "../components/user"
import API_BASE_URL from "../config";
export default function Home(){

const [users,setUsers]=useState([]);
const [loading,setLoading]=useState(false);


useEffect(()=>{
    const fetchUsers= async()=>{

           setLoading(true);
           const token=localStorage.getItem('token')
           const response= await fetch(`${API_BASE_URL}/api/users/allusers`,{
            method: 'GET',
            headers: {
                "Content-Type": "application/json",
               "Authorization": `Bearer ${token}`,
            }
           })
           const data=await response.json();
         
           if(response.status===200){
            setUsers(prev => {
             const ids = new Set(prev.map(u => u._id));
            const newUsers = data.filter(u => !ids.has(u._id));
            return [...prev, ...newUsers];
              });

           }else{
            console.log("error in fetchusers",response);
           }
           setLoading(false);
    }
    fetchUsers();
},[]);


return(
    <div className="flex flex-col w-full m-0 p-0 px-0 bg-gray-900 min-h-[calc(100vh-164px)] " style={{boxSizing: 'border-box'}}>
        { users.map((user)=>(
               <User key={user._id} user={user}/>
            ))
        }
    </div>
)
}