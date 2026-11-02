import { User } from "@/src/features/user/user.types";

function isUser(value: unknown): value is User {
  return !!value && typeof value === "object" && "id" in value &&
    typeof value.id === "string" && "username" in value &&
    typeof value.username === "string" ;
    // && "roleAssignments" in value &&
    // Array.isArray(value.roleAssignments);
}
export { isUser}