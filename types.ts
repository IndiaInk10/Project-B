
export interface LegoPart {
  id: string; // The part design ID (e.g., "3001")
  name: string;
  category: string;
  imageUrl: string;
  ldrawId: string;
}

// Represents a single part visually on the canvas
export interface ScatteredPart extends LegoPart {
  instanceId: string; // Unique ID for this specific brick instance
  x: number;
  y: number;
  rotation: number;
  zIndex: number;
}

// Represents the aggregated list sent to the AI
export interface InventoryItem {
  part: LegoPart;
  quantity: number;
}

export interface BuildIdea {
  title: string;
  description: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Expert' | 'Master';
  estimatedParts: number;
  reasoning: string;
  theme: string;
  imageUrl?: string;
  // Strict inventory tracking
  usedParts: string[]; // List of parts from the user's inventory used here
  missingParts: string[]; // List of extra parts required but not in inventory
}

export interface DbSchemaTable {
  tableName: string;
  description: string;
  columns: { name: string; type: string; note?: string }[];
}
