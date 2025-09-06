import ChattingBox from './pages/chattingBox';
import { useLocation , Route,Router,Routes, BrowserRouter, Navigate} from 'react-router-dom';
import Login from './pages/login'
import Signup from './pages/signUp'
import AllUsers from './pages/allUsers'
import MainLayout from './components/mainLayout';
import PendingRequests from "./pages/requests"
import Friends from './pages/allFriends';
import PrivateRoute from './components/privateRoute';
import Settings from './pages/settings'
import {motion, AnimatePresence} from 'framer-motion';
function ChattingBoxWrapper() {
  const location = useLocation();
  const receiver = location.state?.user;

  if (!receiver) {
    return <div className="text-center text-red-500 p-8">No user selected.</div>;
  }

  return (
    <div className="flex flex-col flex-grow h-full min-h-full w-full">
      <ChattingBox receiver={receiver} />
    </div>
  );
}

function AppContent() {
  const location =useLocation();

  return (
    <AnimatePresence mode="wait">
     <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
      <Routes location={location}>
        <Route path="/" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
       
          <Route path="/chat/:id" element={
            <PrivateRoute>
            <ChattingBoxWrapper />
            </PrivateRoute>
            } />
          <Route element={
            <PrivateRoute>
            <MainLayout />
            </PrivateRoute>
            }>
          <Route path="/allUsers" element={
             <PrivateRoute>
             <AllUsers /> 
             </PrivateRoute>
            } />
           <Route path="/friends" element={
            <PrivateRoute>
            <Friends/>
            </PrivateRoute>
            }/>
            <Route path="/pendingrequests" element={
              <PrivateRoute>
            <PendingRequests/>
            </PrivateRoute>
              }/>

               <Route path="/settings" element={
              <PrivateRoute>
            <Settings/>
            </PrivateRoute>
              }/>

          </Route>
        <Route path="*" element={<Navigate to="/" replace/>}>
        </Route>
      </Routes>
      </motion.div>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}
