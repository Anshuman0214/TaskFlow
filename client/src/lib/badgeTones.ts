export const roleTone = (role: string): "purple" | "blue" | "green" | "gray" | "yellow" => {
  switch (role) {
    case "OWNER":
      return "purple";
    case "ADMIN":
      return "blue";
    case "MANAGER":
      return "green";
    case "GUEST":
      return "yellow";
    default:
      return "gray";
  }
};

export const statusTone = (status: string): "green" | "gray" | "yellow" | "blue" => {
  switch (status) {
    case "ACTIVE":
    case "DONE":
      return "green";
    case "ARCHIVED":
      return "gray";
    case "ON_HOLD":
    case "BLOCKED":
      return "yellow";
    default:
      return "blue";
  }
};

export const priorityTone = (priority: string): "gray" | "blue" | "yellow" | "red" => {
  switch (priority) {
    case "LOW":
      return "gray";
    case "MEDIUM":
      return "blue";
    case "HIGH":
      return "yellow";
    case "CRITICAL":
      return "red";
    default:
      return "gray";
  }
};
