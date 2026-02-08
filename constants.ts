import { LegoPart, DbSchemaTable } from './types';

export const SAMPLE_PARTS: LegoPart[] = [
  {
    id: "3001",
    name: "Brick 2 x 4",
    category: "Bricks",
    ldrawId: "3001.dat",
    imageUrl: "https://cdn.rebrickable.com/media/parts/ldraw/15/3001.png"
  },
  {
    id: "3020",
    name: "Plate 2 x 4",
    category: "Plates",
    ldrawId: "3020.dat",
    imageUrl: "https://cdn.rebrickable.com/media/parts/ldraw/4/3020.png"
  },
  {
    id: "60478",
    name: "Plate Special 1 x 2 [Handle on End]",
    category: "Plates Special",
    ldrawId: "60478.dat",
    imageUrl: "https://cdn.rebrickable.com/media/parts/ldraw/0/60478.png"
  },
  {
    id: "3660",
    name: "Slope Inverted 45 2 x 2",
    category: "Slopes",
    ldrawId: "3660.dat",
    imageUrl: "https://cdn.rebrickable.com/media/parts/ldraw/71/3660.png"
  },
  {
    id: "2420",
    name: "Plate Corner 2 x 2",
    category: "Plates",
    ldrawId: "2420.dat",
    imageUrl: "https://cdn.rebrickable.com/media/parts/ldraw/14/2420.png"
  },
  {
    id: "4733",
    name: "Brick Special 1 x 1 on 4 Sides",
    category: "Bricks Special",
    ldrawId: "4733.dat",
    imageUrl: "https://cdn.rebrickable.com/media/parts/ldraw/0/4733.png"
  },
  {
    id: "6111",
    name: "Brick 1 x 10",
    category: "Bricks",
    ldrawId: "6111.dat",
    imageUrl: "https://cdn.rebrickable.com/media/parts/ldraw/15/6111.png"
  },
  {
    id: "3005",
    name: "Brick 1 x 1",
    category: "Bricks",
    ldrawId: "3005.dat",
    imageUrl: "https://cdn.rebrickable.com/media/parts/ldraw/4/3005.png"
  },
  {
    id: "6118",
    name: "Wheel Hard Plastic Small",
    category: "Wheels",
    ldrawId: "6118.dat",
    imageUrl: "https://cdn.rebrickable.com/media/parts/ldraw/0/6118.png"
  },
  {
    id: "3823",
    name: "Windscreen 2 x 4 x 2",
    category: "Windows",
    ldrawId: "3823.dat",
    imageUrl: "https://cdn.rebrickable.com/media/parts/ldraw/43/3823.png"
  },
  {
    id: "3700",
    name: "Technic Brick 1 x 2 [Hole]",
    category: "Technic",
    ldrawId: "3700.dat",
    imageUrl: "https://cdn.rebrickable.com/media/parts/ldraw/4/3700.png"
  }
];

export const DB_SCHEMA_GUIDE: DbSchemaTable[] = [
  {
    tableName: "Parts",
    description: "Core table storing unique part definitions.",
    columns: [
      { name: "part_num", type: "VARCHAR(20)", note: "PK. Official LEGO ID or LDraw ID" },
      { name: "name", type: "VARCHAR(255)", note: "Descriptive name" },
      { name: "part_cat_id", type: "INT", note: "FK to Categories" },
      { name: "ldraw_blob", type: "BLOB/TEXT", note: "Raw LDraw file content or S3 path" },
      { name: "embedding", type: "VECTOR(768)", note: "Gemini visual embedding for search" }
    ]
  },
  {
    tableName: "Scan_Sessions",
    description: "Stores user uploaded images or camera captures.",
    columns: [
      { name: "session_id", type: "UUID", note: "PK" },
      { name: "user_id", type: "INT", note: "FK" },
      { name: "image_url", type: "VARCHAR(500)", note: "S3 URL of the scan" },
      { name: "created_at", type: "TIMESTAMP", note: "" }
    ]
  },
  {
    tableName: "Detected_Parts",
    description: "Results from the Vision AI analysis linked to a session.",
    columns: [
      { name: "id", type: "INT", note: "PK" },
      { name: "session_id", type: "UUID", note: "FK to Scan_Sessions" },
      { name: "part_num", type: "VARCHAR(20)", note: "FK to Parts" },
      { name: "confidence", type: "FLOAT", note: "AI Confidence score (0.0-1.0)" },
      { name: "box_coordinates", type: "JSON", note: "Bounding box [x,y,w,h]" }
    ]
  },
  {
    tableName: "Inventories",
    description: "Linking table between Sets/MOCs and Parts.",
    columns: [
      { name: "id", type: "INT", note: "PK" },
      { name: "set_num", type: "VARCHAR(20)", note: "FK to Sets" },
      { name: "part_num", type: "VARCHAR(20)", note: "FK to Parts" },
      { name: "quantity", type: "INT", note: "Count in set" }
    ]
  }
];
