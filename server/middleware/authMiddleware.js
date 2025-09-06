const jwt= require("jsonwebtoken");

exports.verifyToken=(req,res,next)=>{
    const authHeader=req.get('authorization');
    const token=authHeader&&authHeader.split(" ")[1];

    if(!token){
      return res.status(401).json({ message: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; 
    console.log("in middleware",decoded);
    next();
  } catch (err) {
    return res.status(403).json({ message: "Invalid or expired token" });
  }
    
}