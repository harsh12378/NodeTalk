// hooks/useInbox.js
import { useQuery } from "@tanstack/react-query";
import api from "../utils/api";

export const useInbox = () => {
  return useQuery({
    queryKey: ["inbox"],
    queryFn: () => api.get("/users/allusers"),
  });
};