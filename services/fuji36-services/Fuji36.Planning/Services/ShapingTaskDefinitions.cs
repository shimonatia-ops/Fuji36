namespace Fuji36.Planning.Services;

public static class ShapingTaskDefinitions
{
    public static readonly Dictionary<int, ShapingTaskConfig> Tasks = new()
    {
        { 1, new ShapingTaskConfig("Shaping Task 1", "Basic Shape Matching", 
            "Match basic shapes to corresponding slots",
            "Place each shape into its matching slot. Focus on precision and hand-eye coordination.",
            null, null, "shape_matching",
            new() { { "threshold", 0.8f }, { "timeLimit", 180 } }) },
        
        { 2, new ShapingTaskConfig("Shaping Task 2", "Placing Blocks Onto Box",
            "Place colored blocks onto designated positions on a box",
            "Carefully place each block onto its marked position. Maintain steady hand movements.",
            null, null, "block_placement",
            new() { { "precision", 0.9f }, { "timeLimit", 300 }, { "blockCount", 6 } }) },
        
        { 3, new ShapingTaskConfig("Shaping Task 3", "Pegboard",
            "Insert pegs into a pegboard following a pattern",
            "Insert pegs into the board following the displayed pattern. Work from left to right, top to bottom.",
            null, null, "pegboard_analysis",
            new() { { "pegCount", 25 }, { "pattern", "sequential" }, { "timeLimit", 600 } }) },
        
        { 4, new ShapingTaskConfig("Shaping Task 4", "Stacking Rings",
            "Stack rings onto a pole in correct order",
            "Stack the rings from largest to smallest. Ensure each ring sits properly on the pole.",
            null, null, "ring_stacking",
            new() { { "ringCount", 5 }, { "order", "descending" }, { "timeLimit", 240 } }) },
        
        { 5, new ShapingTaskConfig("Shaping Task 5", "Shape Sorting",
            "Sort different shapes into matching containers",
            "Sort each shape into its corresponding container. Work systematically through all shapes.",
            null, null, "shape_sorting",
            new() { { "shapeTypes", 4 }, { "precision", 0.85f }, { "timeLimit", 360 } }) },
        
        { 6, new ShapingTaskConfig("Shaping Task 6", "Puzzle Assembly",
            "Assemble a simple puzzle",
            "Assemble the puzzle pieces to complete the image. Start with corner and edge pieces.",
            null, null, "puzzle_assembly",
            new() { { "pieceCount", 12 }, { "timeLimit", 480 } }) },
        
        { 7, new ShapingTaskConfig("Shaping Task 7", "Button Sorting",
            "Sort buttons by color and size",
            "Sort buttons into groups by color, then by size within each color group.",
            null, null, "button_sorting",
            new() { { "buttonCount", 20 }, { "categories", 2 }, { "timeLimit", 420 } }) },
        
        { 8, new ShapingTaskConfig("Shaping Task 8", "Bead Threading",
            "Thread beads onto a string in a specific pattern",
            "Thread beads onto the string following the color pattern shown. Maintain consistent spacing.",
            null, null, "bead_threading",
            new() { { "beadCount", 15 }, { "pattern", "alternating" }, { "timeLimit", 540 } }) },
        
        { 9, new ShapingTaskConfig("Shaping Task 9", "Card Sorting",
            "Sort playing cards by suit and number",
            "Sort the cards first by suit, then by number within each suit.",
            null, null, "card_sorting",
            new() { { "cardCount", 20 }, { "suits", 4 }, { "timeLimit", 480 } }) },
        
        { 10, new ShapingTaskConfig("Shaping Task 10", "Block Tower Building",
            "Build a tower with blocks following a pattern",
            "Build a tower using blocks in the order specified. Ensure stability at each level.",
            null, null, "tower_building",
            new() { { "blockCount", 8 }, { "height", 4 }, { "timeLimit", 360 } }) },
        
        { 11, new ShapingTaskConfig("Shaping Task 11", "Coin Sorting",
            "Sort coins by denomination",
            "Sort coins into groups by their value. Handle each coin carefully.",
            null, null, "coin_sorting",
            new() { { "coinCount", 30 }, { "denominations", 4 }, { "timeLimit", 420 } }) },
        
        { 12, new ShapingTaskConfig("Shaping Task 12", "Lacing Task",
            "Thread a lace through holes in a pattern",
            "Thread the lace through the holes following the pattern. Maintain even tension.",
            null, null, "lacing",
            new() { { "holeCount", 12 }, { "pattern", "crisscross" }, { "timeLimit", 600 } }) },
        
        { 13, new ShapingTaskConfig("Shaping Task 13", "Magnetic Shape Matching",
            "Match magnetic shapes to metal board positions",
            "Place each magnetic shape onto its corresponding position on the metal board.",
            null, null, "magnetic_matching",
            new() { { "shapeCount", 8 }, { "precision", 0.9f }, { "timeLimit", 300 } }) },
        
        { 14, new ShapingTaskConfig("Shaping Task 14", "Container Lid Matching",
            "Match container lids to their containers",
            "Match each lid to its corresponding container. Test the fit to ensure correct matching.",
            null, null, "lid_matching",
            new() { { "containerCount", 6 }, { "timeLimit", 240 } }) },
        
        { 15, new ShapingTaskConfig("Shaping Task 15", "Color Block Sequencing",
            "Arrange colored blocks in a specific sequence",
            "Arrange the blocks in the color sequence shown. Work from left to right.",
            null, null, "color_sequencing",
            new() { { "blockCount", 10 }, { "sequenceLength", 5 }, { "timeLimit", 360 } }) },
        
        { 16, new ShapingTaskConfig("Shaping Task 16", "Nuts and Bolts Assembly",
            "Match and assemble nuts with bolts",
            "Match each nut to its corresponding bolt and thread them together.",
            null, null, "nuts_bolts",
            new() { { "pairCount", 6 }, { "timeLimit", 480 } }) },
        
        { 17, new ShapingTaskConfig("Shaping Task 17", "Pattern Block Replication",
            "Replicate a pattern using blocks",
            "Replicate the displayed pattern using the available blocks. Match colors and positions exactly.",
            null, null, "pattern_replication",
            new() { { "blockCount", 12 }, { "patternComplexity", "medium" }, { "timeLimit", 540 } }) },
        
        { 18, new ShapingTaskConfig("Shaping Task 18", "String Bead Pattern",
            "Create a pattern by stringing beads",
            "String beads onto the cord to match the pattern shown. Follow the color sequence carefully.",
            null, null, "bead_pattern",
            new() { { "beadCount", 18 }, { "patternLength", 9 }, { "timeLimit", 600 } }) },
        
        { 19, new ShapingTaskConfig("Shaping Task 19", "Geometric Shape Assembly",
            "Assemble geometric shapes into a larger form",
            "Assemble the geometric pieces to form the complete shape shown in the reference.",
            null, null, "geometric_assembly",
            new() { { "pieceCount", 7 }, { "shapeType", "complex" }, { "timeLimit", 480 } }) },
        
        { 20, new ShapingTaskConfig("Shaping Task 20", "Multi-Step Object Manipulation",
            "Complete a multi-step object manipulation task",
            "Follow the sequence: pick up object, rotate, place in container, secure lid. Complete all steps in order.",
            null, null, "multi_step",
            new() { { "stepCount", 4 }, { "complexity", "high" }, { "timeLimit", 720 } }) },
    };
}

public sealed record ShapingTaskConfig(
    string Name,
    string DisplayName,
    string? Description = null,
    string? Instructions = null,
    int? TargetRepetitions = null,
    TimeSpan? EstimatedDuration = null,
    string? AnalysisType = null,
    Dictionary<string, object>? AnalysisParameters = null
);
