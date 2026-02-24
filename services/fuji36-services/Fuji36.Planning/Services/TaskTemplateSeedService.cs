using Fuji36.Common.Contracts.Planning;
using Fuji36.Planning.Data;
using Fuji36.Planning.Models;
using Microsoft.Extensions.Hosting;
using MongoDB.Bson;
using MongoDB.Driver;

namespace Fuji36.Planning.Services;

/// <summary>
/// Seed service to populate initial task templates in the database
/// </summary>
public sealed class TaskTemplateSeedService : IHostedService
{
    private readonly MongoContext _db;
    private readonly ILogger<TaskTemplateSeedService>? _logger;
    private readonly ITaskFactory _taskFactory;

    public TaskTemplateSeedService(MongoContext db, ITaskFactory taskFactory, ILogger<TaskTemplateSeedService>? logger = null)
    {
        _db = db;
        _taskFactory = taskFactory;
        _logger = logger;
    }

    public async Task StartAsync(CancellationToken cancellationToken)
    {
        try
        {
            _logger?.LogInformation("Starting task template seed...");

            // Seed ShapingTask1 (Basic Shape Matching)
            await EnsureTemplateAsync(
                "ShapingTask1",
                "Shaping Task 1",
                TaskType.ShapingTask,
                "Basic Shape Matching",
                "Match basic shapes to corresponding slots",
                new Dictionary<string, object>
                {
                    { "taskNumber", 1 },
                    { "displayName", "Basic Shape Matching" },
                    { "instructions", "Place each shape into its matching slot. Focus on precision and hand-eye coordination." },
                    { "analysisType", "shape_matching" },
                    { "analysisParameters", new Dictionary<string, object>
                        {
                            { "threshold", 0.8f },
                            { "timeLimit", 180 }
                        }
                    }
                },
                cancellationToken);

            // Seed ShapingTask2 (Placing Blocks Onto Box)
            await EnsureTemplateAsync(
                "ShapingTask2",
                "Shaping Task 2",
                TaskType.ShapingTask,
                "Placing Blocks Onto Box",
                "A box and several blocks are used for this task. The subject moves small wooden blocks from the table to the top of a box. The placement and height of the box depend on the movements desired.",
                new Dictionary<string, object>
                {
                    { "taskNumber", 2 },
                    { "displayName", "Placing Blocks Onto Box" },
                    { "instructions", "Move small wooden blocks from the table to the top of a box. The box can be placed directly in front to challenge shoulder flexion and elbow extension, or to the side to challenge shoulder abduction and elbow extension." },
                    { "progressionParameters", new Dictionary<string, object>
                        {
                            { "distance", "The box can be moved farther away to challenge elbow extension" },
                            { "height", "A higher box can be used to challenge shoulder flexion" },
                            { "sizeOfObject", "Larger or smaller blocks can be used to challenge wrist and hand control" }
                        }
                    },
                    { "feedbackParameters", new Dictionary<string, object>
                        {
                            { "numberOfRepetitions", "Number of blocks placed on the box in a given period of time" },
                            { "time", "Time required to place a set number of blocks on the box" }
                        }
                    },
                    { "movementsEmphasized", new[] { "Pincer grasp", "Wrist extension", "Elbow extension", "Shoulder flexion" } },
                    { "feasibilityNotes", "Naive solution: reaching to the box = repetition. Requires hand detection + user calibration (set up start and end zones). Feasible. Better solution: repetition = block is placed onto box, and doesn't fall. Requires hand detection, box detection, block detection. Better in 3D. Fine movements are detected: detecting pincer grasp." },
                    { "analysisType", "block_placement" },
                    { "analysisParameters", new Dictionary<string, object>
                        {
                            { "precision", 0.9f },
                            { "timeLimit", 300 },
                            { "blockCount", 6 }
                        }
                    }
                },
                cancellationToken);

            // Seed ShapingTask3 (Pegboard)
            await EnsureTemplateAsync(
                "ShapingTask3",
                "Shaping Task 3",
                TaskType.ShapingTask,
                "Pegboard",
                "A pegboard and pegs are used with this task. The subject lifts a wooden peg and places it in a designated hole on the pegboard. The pegboard can be placed on a box to challenge shoulder flexion.",
                new Dictionary<string, object>
                {
                    { "taskNumber", 3 },
                    { "displayName", "Pegboard" },
                    { "instructions", "Lift a wooden peg and place it in a designated hole on the pegboard. The pegboard can be placed on a box to challenge shoulder flexion." },
                    { "progressionParameters", new Dictionary<string, object>
                        {
                            { "distance", "The pegboard can be placed farther away to challenge elbow extension" },
                            { "height", "A higher box can be used to challenge shoulder flexion" },
                            { "sizeOfPegs", "Taller or shorter pegs can be used to challenge fingers control" }
                        }
                    },
                    { "feedbackParameters", new Dictionary<string, object>
                        {
                            { "numberOfRepetitions", "Number of pegs placed in a hole in a given period of time" },
                            { "time", "Time required to fill the pegboard or a given number of pegs" }
                        }
                    },
                    { "movementsEmphasized", new[] { "Pincer grasp", "Wrist extension", "Elbow extension", "Shoulder flexion" } },
                    { "feasibilityNotes", "Challenging. Board should be placed so it is seen by the camera, however the patient's body might be in the way. Also, requires detection of pegs/holes." },
                    { "analysisType", "pegboard_analysis" },
                    { "analysisParameters", new Dictionary<string, object>
                        {
                            { "pegCount", 25 },
                            { "pattern", "sequential" },
                            { "timeLimit", 600 }
                        }
                    }
                },
                cancellationToken);

            // Seed ShapingTask9 (Opening and Shutting Cabinet Door)
            await EnsureTemplateAsync(
                "ShapingTask9",
                "Shaping Task 9",
                TaskType.ShapingTask,
                "Opening and Shutting Cabinet Door",
                "The subject stands facing the cabinets. The distance from the cabinet is measured and marked. The subject practices opening and closing the cabinet door.",
                new Dictionary<string, object>
                {
                    { "taskNumber", 9 },
                    { "displayName", "Opening and Shutting Cabinet Door" },
                    { "instructions", "Stand facing the cabinets. Practice opening and closing the cabinet door. The distance from the cabinet is measured and marked." },
                    { "progressionParameters", new Dictionary<string, object>
                        {
                            { "distance", "Increase the distance so that the subject is standing further away from the cabinet" },
                            { "number", "Increase the number of repetitions of opening and closing the cabinets" }
                        }
                    },
                    { "feedbackParameters", new Dictionary<string, object>
                        {
                            { "numberOfRepetitions", "The number of repetitions of opening and closing the cabinets in a given time" },
                            { "time", "The time that it takes for the subject to open and close the cabinet for a set number of repetitions" }
                        }
                    },
                    { "movementsEmphasized", new[] { "Palmar grasp", "Lateral prehension", "Supination", "Elbow flexion and extension", "Shoulder flexion and extension" } },
                    { "feasibilityNotes", "Challenging. Capturing the cabinets by the camera, detecting their state - are harder." },
                    { "analysisType", "cabinet_door" },
                    { "analysisParameters", new Dictionary<string, object>
                        {
                            { "timeLimit", 300 }
                        }
                    }
                },
                cancellationToken);

            // Seed ShapingTask10 (Turning Pages Of Magazine)
            await EnsureTemplateAsync(
                "ShapingTask10",
                "Shaping Task 10",
                TaskType.ShapingTask,
                "Turning Pages Of Magazine",
                "Place magazine on table. Ask subject to turn the pages of the magazine. Have the subject concentrate on turning pages by either pronating or supinating",
                new Dictionary<string, object>
                {
                    { "taskNumber", 10 },
                    { "displayName", "Turning Pages Of Magazine" },
                    { "instructions", "Place magazine on table. Turn the pages of the magazine. Concentrate on turning pages by either pronating or supinating." },
                    { "progressionParameters", new Dictionary<string, object>
                        {
                            { "distance", "The position of the magazine can be changed (move farther away from subject) to challenge elbow extension" },
                            { "duration", "Increase the amount of time for subject to turn the pages or increase the number of pages that the subject must turn to challenge the subject's endurance" },
                            { "height", "The magazine can be placed on box to challenge shoulder flexion" }
                        }
                    },
                    { "feedbackParameters", new Dictionary<string, object>
                        {
                            { "numberOfPages", "Number of pages turned in a set amount of time" },
                            { "time", "Time required to turn a set number of pages" }
                        }
                    },
                    { "movementsEmphasized", new[] { "Forearm supination", "Forearm pronation", "Pincer or lateral pincer grasp", "Shoulder internal and external rotation" } },
                    { "feasibilityNotes", "Challenging. Requires detection of pronation/supination of the hand. Can be achieved if there's a dataset." },
                    { "analysisType", "page_turning" },
                    { "analysisParameters", new Dictionary<string, object>
                        {
                            { "timeLimit", 600 }
                        }
                    }
                },
                cancellationToken);

            // Seed ShapingTask11 (Flipping Dominoes)
            await EnsureTemplateAsync(
                "ShapingTask11",
                "Shaping Task 11",
                TaskType.ShapingTask,
                "Flipping Dominoes",
                "Dominoes are placed in front of the subject. The subject is asked to reach forward and flip the dominoes. The strategy by which the subject is instructed to turn over each domino depends upon the movement or grasp the therapist wishes to emphasize.",
                new Dictionary<string, object>
                {
                    { "taskNumber", 11 },
                    { "displayName", "Flipping Dominoes" },
                    { "instructions", "Reach forward and flip the dominoes. The strategy by which you turn over each domino depends upon the movement or grasp the therapist wishes to emphasize." },
                    { "progressionParameters", new Dictionary<string, object>
                        {
                            { "distance", "Placing the dominoes farther away to challenge elbow extension" },
                            { "sizeOfObject", "Using larger or smaller dominoes to challenge wrist and finger control" },
                            { "height", "Place dominoes on a box to challenge shoulder flexion" }
                        }
                    },
                    { "feedbackParameters", new Dictionary<string, object>
                        {
                            { "numberOfRepetitions", "Number of dominoes flipped in a set period of time" },
                            { "time", "Time required to flip a set number of dominoes" }
                        }
                    },
                    { "movementsEmphasized", new[] { "Lateral pincer grasp", "Wrist extension", "Forearm supination/pronation (depending on direction of flip)", "Shoulder flexion (if placed on a box)" } },
                    { "feasibilityNotes", "Challenging. Solutions: Detect supination/pronation of the hand - but then you don't detect if the domino was flipped or not. Requires data collection. Detect the state of the dominoes - requires dataset collection, and working with a designated standard set." },
                    { "analysisType", "domino_flipping" },
                    { "analysisParameters", new Dictionary<string, object>
                        {
                            { "timeLimit", 480 }
                        }
                    }
                },
                cancellationToken);

            // Seed ShapingTask13 (Keyboard)
            await EnsureTemplateAsync(
                "ShapingTask13",
                "Shaping Task 13",
                TaskType.ShapingTask,
                "Keyboard",
                "Place keyboard on the table. Have subject place hand on table and ask him to depress a key repeatedly with one finger at a time. Subject is instructed to isolate the individual finger movements by keeping their forearm as flat as possible on the table.",
                new Dictionary<string, object>
                {
                    { "taskNumber", 13 },
                    { "displayName", "Keyboard" },
                    { "instructions", "Place hand on table and depress a key repeatedly with one finger at a time. Isolate the individual finger movements by keeping your forearm as flat as possible on the table." },
                    { "progressionParameters", new Dictionary<string, object>
                        {
                            { "distance", "Move the keyboard farther away from the subject to challenge elbow extension" },
                            { "duration", "Increase the amount of time to challenge the subject's endurance" }
                        }
                    },
                    { "feedbackParameters", new Dictionary<string, object>
                        {
                            { "numberOfRepetitions", "Number of depressions accomplished in a set period of time" },
                            { "time", "Time required to depress key a set number of times" }
                        }
                    },
                    { "movementsEmphasized", new[] { "Finger flexion", "Finger extension" } },
                    { "feasibilityNotes", "Doable. Solutions: Use a keyboard which connects via bluetooth to the app - then repetitions can be easily counted. Combine with detection of finger movements - to see that there is indeed isolation of the fingers. Requires having a keyboard which can easily connect to our device (mobile/tablet/laptop)." },
                    { "analysisType", "keyboard_typing" },
                    { "analysisParameters", new Dictionary<string, object>
                        {
                            { "timeLimit", 300 }
                        }
                    }
                },
                cancellationToken);

            // Seed ShapingTask15 (Marbles To Board or Rack)
            await EnsureTemplateAsync(
                "ShapingTask15",
                "Shaping Task 15",
                TaskType.ShapingTask,
                "Marbles To Board or Rack",
                "Marbles are placed in a bowl and a Chinese checkerboard or rack is placed in front of the subject. The subject is asked to pick up the marbles (one at a time) and place them on the checkerboard or rack. The subject is asked to place the marbles carefully so that they do not roll off the board.",
                new Dictionary<string, object>
                {
                    { "taskNumber", 15 },
                    { "displayName", "Marbles To Board or Rack" },
                    { "instructions", "Pick up the marbles (one at a time) from the bowl and place them on the checkerboard or rack. Place the marbles carefully so that they do not roll off the board." },
                    { "progressionParameters", new Dictionary<string, object>
                        {
                            { "distance", "Placing the bowl and checkerboard or rack farther away from each other to challenge elbow extension and shoulder flexion" },
                            { "sizeOfObject", "Using larger or smaller marbles to challenge finger dexterity" },
                            { "number", "Increase the number of marbles to challenge the subject's endurance" },
                            { "height", "Place the board or rack on a box to challenge shoulder flexion" }
                        }
                    },
                    { "feedbackParameters", new Dictionary<string, object>
                        {
                            { "numberOfRepetitions", "Number of marbles placed in a set period of time" },
                            { "time", "Time required to place a set number of marbles" }
                        }
                    },
                    { "movementsEmphasized", new[] { "Fine motor skills of fingers", "Wrist extension" } },
                    { "feasibilityNotes", "If not-rolling is an important requirement - then we are required to detect the marbles (=dataset). If correct positioning on the checkerboard is required - then we should detect the checkerboard. Requires using a standard checkerboard, and detecting it (possible without a dataset)." },
                    { "analysisType", "marble_placement" },
                    { "analysisParameters", new Dictionary<string, object>
                        {
                            { "timeLimit", 600 }
                        }
                    }
                },
                cancellationToken);

            // Seed ShapingTask16 (Putting Sticks Into Bottle)
            await EnsureTemplateAsync(
                "ShapingTask16",
                "Shaping Task 16",
                TaskType.ShapingTask,
                "Putting Sticks Into Bottle",
                "Coffee stirrers and a bottle are placed on the table. The subject is asked to pick up the stirrers and place them in the bottle by either pronating or supinating the forearm. May change the type of grasp required to challenge wrist and finger control.",
                new Dictionary<string, object>
                {
                    { "taskNumber", 16 },
                    { "displayName", "Putting Sticks Into Bottle" },
                    { "instructions", "Pick up the coffee stirrers and place them in the bottle by either pronating or supinating the forearm. The type of grasp required may be changed to challenge wrist and finger control." },
                    { "progressionParameters", new Dictionary<string, object>
                        {
                            { "distance", "Move the bottle farther from the subject to challenge elbow extension" },
                            { "height", "Place the bottle on a box to challenge shoulder flexion" },
                            { "sizeOfContainer", "Use bottles with progressively smaller openings to challenge wrist and hand control" },
                            { "number", "Increase the number of stirrers to challenge the subject's endurance" }
                        }
                    },
                    { "feedbackParameters", new Dictionary<string, object>
                        {
                            { "numberOfRepetitions", "Number of stirrers in bottle in set period of time" },
                            { "time", "Time required to get set number of stirrers into bottle" }
                        }
                    },
                    { "movementsEmphasized", new[] { "Various grasps", "Forearm pronation", "Forearm supination", "Depending on placement of bottle, shoulder flexion, abduction, and rotation" } },
                    { "feasibilityNotes", "Naive solution: detect hand movement from start to bottle. Better solution: Requires detection of pronation/supination of the arm. Requires detection of stirrers and bottle (dataset collection)." },
                    { "analysisType", "stick_placement" },
                    { "analysisParameters", new Dictionary<string, object>
                        {
                            { "timeLimit", 480 }
                        }
                    }
                },
                cancellationToken);

            // Seed ShapingTask17 (Cotton Balls)
            await EnsureTemplateAsync(
                "ShapingTask17",
                "Shaping Task 17",
                TaskType.ShapingTask,
                "Cotton Balls",
                "Cotton balls and some type of container are placed on the table. The subject is asked to pick the cotton balls up off of the table and place them in the container. The subject is instructed to try to use a pincer grasp.",
                new Dictionary<string, object>
                {
                    { "taskNumber", 17 },
                    { "displayName", "Cotton Balls" },
                    { "instructions", "Pick the cotton balls up off of the table and place them in the container. Try to use a pincer grasp." },
                    { "progressionParameters", new Dictionary<string, object>
                        {
                            { "sizeOfContainer", "Use containers with progressively smaller openings to challenge wrist and hand control" },
                            { "distance", "Move the container farther away to challenge elbow extension" },
                            { "height", "Place the container or cotton balls on a box to challenge shoulder flexion" },
                            { "number", "Increase the number of cotton balls to challenge the subject's endurance" }
                        }
                    },
                    { "feedbackParameters", new Dictionary<string, object>
                        {
                            { "time", "Time required to place a set number of cotton balls in the container" },
                            { "numberOfRepetitions", "Number of balls placed in the container in a set period of time" }
                        }
                    },
                    { "movementsEmphasized", new[] { "Pincer grasp", "Wrist extension", "Depending on the placement of balls and container, elbow extension, shoulder flexion, adduction, abduction" } },
                    { "feasibilityNotes", "Naive: hand detection + zone setup. Feasible. Better: pincer grasp detection, container detection, cotton ball detection." },
                    { "analysisType", "cotton_ball_placement" },
                    { "analysisParameters", new Dictionary<string, object>
                        {
                            { "timeLimit", 420 }
                        }
                    }
                },
                cancellationToken);

            // Seed ShapingTask20 (Poker Chips)
            await EnsureTemplateAsync(
                "ShapingTask20",
                "Shaping Task 20",
                TaskType.ShapingTask,
                "Poker Chips",
                "A piggy bank, poker chips, and dartboard grid or play-doh are used for this task. The hole in the piggy bank is made large enough for the poker chips to be placed in the bank. The subject is asked to pick up the poker chips one at a time and place them in the piggy bank.",
                new Dictionary<string, object>
                {
                    { "taskNumber", 20 },
                    { "displayName", "Poker Chips" },
                    { "instructions", "Pick up the poker chips one at a time and place them in the piggy bank. The poker chips can be arranged on a dartboard grid or in a lump of Play-doh so that they stand upright initially to make it easier to pick them up. May lay the poker chips flat on the table to challenge pincer grasp and coordination." },
                    { "progressionParameters", new Dictionary<string, object>
                        {
                            { "number", "Increase the number of chips that the subject is required to place in the bank to challenge endurance" },
                            { "distance", "Move the bank farther away from the subject to challenge elbow extension" },
                            { "height", "Place the bank on a box on top of the table to challenge shoulder flexion" },
                            { "sizeOfObject", "The size of the slot in the bank can be decreased with improvement to challenge accuracy" }
                        }
                    },
                    { "feedbackParameters", new Dictionary<string, object>
                        {
                            { "numberOfRepetitions", "Number of poker chips the subject is able to place in the bank in a set period of time" },
                            { "time", "Time required to place a set number of poker chips in the bank" }
                        }
                    },
                    { "movementsEmphasized", new[] { "Pincer grasp", "Wrist extension", "Elbow extension and shoulder flexion depending on the placement of objects" } },
                    { "feasibilityNotes", "Naive: hand detection + zone setup. Feasible. Better: chip detection, pincer grip detection, piggy bank detection?" },
                    { "analysisType", "poker_chip_placement" },
                    { "analysisParameters", new Dictionary<string, object>
                        {
                            { "timeLimit", 540 }
                        }
                    }
                },
                cancellationToken);

            // Seed ShapingTask22 (Wrist Extensions)
            await EnsureTemplateAsync(
                "ShapingTask22",
                "Shaping Task 22",
                TaskType.ShapingTask,
                "Wrist Extensions",
                "The subject rests their forearm on a table so that their wrist is at the edge and their hand is dangling off the edge of the table. They are then asked to repeatedly raise their wrist and touch a target (such as a suspended bell) with the distal hand.",
                new Dictionary<string, object>
                {
                    { "taskNumber", 22 },
                    { "displayName", "Wrist Extensions" },
                    { "instructions", "Rest your forearm on a table so that your wrist is at the edge and your hand is dangling off the edge of the table. Repeatedly raise your wrist and touch a target (such as a suspended bell) with the distal hand." },
                    { "progressionParameters", new Dictionary<string, object>
                        {
                            { "height", "Increase the height of the target to required more wrist extension" }
                        }
                    },
                    { "feedbackParameters", new Dictionary<string, object>
                        {
                            { "numberOfRepetitions", "Number of wrist extensions in a set period of time" },
                            { "time", "Time required to extend the wrist a set number of times" }
                        }
                    },
                    { "movementsEmphasized", new[] { "Wrist extension" } },
                    { "feasibilityNotes", "Feasible. Required hand detection + joints, detect position of fingers (compared to mark/object being reached out to)." },
                    { "analysisType", "wrist_extension" },
                    { "analysisParameters", new Dictionary<string, object>
                        {
                            { "timeLimit", 300 }
                        }
                    }
                },
                cancellationToken);

            // Seed ShapingTask23 (Water Bottle)
            await EnsureTemplateAsync(
                "ShapingTask23",
                "Shaping Task 23",
                TaskType.ShapingTask,
                "Water Bottle",
                "A water bottle or coke bottle filled with fluid is placed on the table. The subject is asked to use a cylindrical grasp to pick up the bottle and move it from one target to another target while maintaining forearm in a neutral position.",
                new Dictionary<string, object>
                {
                    { "taskNumber", 23 },
                    { "displayName", "Water Bottle" },
                    { "instructions", "Use a cylindrical grasp to pick up the bottle and move it from one target to another target while maintaining forearm in a neutral position." },
                    { "progressionParameters", new Dictionary<string, object>
                        {
                            { "sizeOfObject", "Vary the size of the bottle to challenge finger flexion / extension" },
                            { "volume", "Vary the amount of liquid in the bottle to challenge finger flexion, elbow and shoulder flexion" },
                            { "distance", "Modify the target positions" }
                        }
                    },
                    { "feedbackParameters", new Dictionary<string, object>
                        {
                            { "numberOfRepetitions", "Number of times the bottle is moved in a set period of time" },
                            { "time", "Time required to accomplish a set number of repetitions" }
                        }
                    },
                    { "movementsEmphasized", new[] { "Cylindrical grasp", "Forearm supination", "Wrist extension" } },
                    { "feasibilityNotes", "Naive: hand detection + zones. Better: Bottle detection? Necessary? Arm position - make sure it stays neutral. Feasible." },
                    { "analysisType", "water_bottle_movement" },
                    { "analysisParameters", new Dictionary<string, object>
                        {
                            { "timeLimit", 360 }
                        }
                    }
                },
                cancellationToken);

            // Seed ShapingTask24 (Dot-to-Dot)
            await EnsureTemplateAsync(
                "ShapingTask24",
                "Shaping Task 24",
                TaskType.ShapingTask,
                "Dot-to-Dot",
                "A dot – to – dot picture is taped to the table. Subject uses a pen or marker. The subject is asked to use the pen / marker to connect the dots to complete the picture. The subject may use a foam build up on pen. The placement of the picture may vary.",
                new Dictionary<string, object>
                {
                    { "taskNumber", 24 },
                    { "displayName", "Dot-to-Dot" },
                    { "instructions", "Use the pen or marker to connect the dots to complete the picture. You may use a foam build up on pen. The placement of the picture may vary." },
                    { "progressionParameters", new Dictionary<string, object>
                        {
                            { "distance", "Vary the placement of the picture (can tape to wall, etc) to challenge shoulder flexion" },
                            { "sizeOfObject", "Vary the size of the picture" },
                            { "number", "Increase the number of dots" }
                        }
                    },
                    { "feedbackParameters", new Dictionary<string, object>
                        {
                            { "number", "Number of dots connected" },
                            { "time", "Time required to complete the picture" }
                        }
                    },
                    { "movementsEmphasized", new[] { "Various grasps", "Wrist flexion / extension", "Elbow extension, shoulder flexion, abduction / adduction" } },
                    { "feasibilityNotes", "Requires detection of pen/marker and dot positions. Can be challenging depending on camera angle and picture placement." },
                    { "analysisType", "dot_to_dot" },
                    { "analysisParameters", new Dictionary<string, object>
                        {
                            { "timeLimit", 600 }
                        }
                    }
                },
                cancellationToken);

            // Seed ShapingTask25 (Fork & Meat – Using magnets instead)
            await EnsureTemplateAsync(
                "ShapingTask25",
                "Shaping Task 25",
                TaskType.ShapingTask,
                "Fork & Meat – Using magnets instead",
                "Pieces of Play-doh are placed on a plate, which is on the table. The subject is asked to use a fork to pick up the pieces of Play-Doh and move them to a container one at a time.",
                new Dictionary<string, object>
                {
                    { "taskNumber", 25 },
                    { "displayName", "Fork & Meat – Using magnets instead" },
                    { "instructions", "Use a fork to pick up the pieces of Play-Doh and move them to a container one at a time. The therapist can assist with pulling the pieces off of the fork if necessary but you should be encouraged to pull the fork out while the therapist holds the Play-Doh. A foam build up may be used on the fork." },
                    { "progressionParameters", new Dictionary<string, object>
                        {
                            { "number", "Increase the number of pieces required to move to challenge endurance" },
                            { "distance", "Modify the position of the plate and / or container to challenge elbow extension, shoulder flexion, adduction / abduction" },
                            { "height", "Place plate on a box to challenge shoulder flexion" }
                        }
                    },
                    { "feedbackParameters", new Dictionary<string, object>
                        {
                            { "time", "Time required moving a set number of pieces" },
                            { "numberOfRepetitions", "Number of pieces moved in a set period of time" }
                        }
                    },
                    { "movementsEmphasized", new[] { "Grasp", "Elbow extension, shoulder flexion, abduction / adduction" } },
                    { "feasibilityNotes", "Naive solution: Hand detection, fork detection, zone setup. Feasible. Better solution: Detect the picked up pieces as well." },
                    { "analysisType", "fork_meat" },
                    { "analysisParameters", new Dictionary<string, object>
                        {
                            { "timeLimit", 480 }
                        }
                    }
                },
                cancellationToken);

            // Seed ShapingTask30 (Stacking Blocks)
            await EnsureTemplateAsync(
                "ShapingTask30",
                "Shaping Task 30",
                TaskType.ShapingTask,
                "Stacking Blocks",
                "The subject is given rectangular wooden blocks, and is asked to build a tower by stacking blocks vertically on the table. The subject continues to stack in this manner until the time interval is over.",
                new Dictionary<string, object>
                {
                    { "taskNumber", 30 },
                    { "displayName", "Stacking Blocks" },
                    { "instructions", "Build a tower by stacking blocks vertically on the table. Continue to stack in this manner until the time interval is over." },
                    { "progressionParameters", new Dictionary<string, object>
                        {
                            { "distance", "Increase the distance of the starting position to challenge elbow extension" },
                            { "height", "Have subject stack blocks on a box" },
                            { "number", "Increase the number of blocks attempted to challenge wrist and finger control" },
                            { "sizeOfObject", "Use various sizes of blocks to challenge control" }
                        }
                    },
                    { "feedbackParameters", new Dictionary<string, object>
                        {
                            { "numberOfRepetitions", "Number of blocks stacked in a set time period" },
                            { "time", "Time required to complete the task" }
                        }
                    },
                    { "movementsEmphasized", new[] { "Shoulder flexion", "Elbow extension", "Wrist extension", "Pincher grasp" } },
                    { "feasibilityNotes", "Might be an issue with capturing tall towers. Also requires block detection." },
                    { "analysisType", "block_stacking" },
                    { "analysisParameters", new Dictionary<string, object>
                        {
                            { "timeLimit", 600 }
                        }
                    }
                },
                cancellationToken);

            // Seed ShapingTask31 (Pouring From Mug)
            await EnsureTemplateAsync(
                "ShapingTask31",
                "Shaping Task 31",
                TaskType.ShapingTask,
                "Pouring From Mug",
                "A mug with a handle, beans or marbles, and a cup or bowl is used for this task. Beans or marbles are placed in the mug. The subject is asked to pick up the mug by the handle and pour the beans into the cup or bowl without spilling any, and then place the mug back on the table.",
                new Dictionary<string, object>
                {
                    { "taskNumber", 31 },
                    { "displayName", "Pouring From Mug" },
                    { "instructions", "Pick up the mug by the handle and pour the beans into the cup or bowl without spilling any, and then place the mug back on the table." },
                    { "progressionParameters", new Dictionary<string, object>
                        {
                            { "sizeOfObject", "Decrease the size of the opening of the container that the subject must pour beans / marbles into to challenge accuracy" },
                            { "height", "Place the receiving container on a box on top of the table to challenge shoulder flexion" },
                            { "distance", "Move the receiving container farther away from the subject to challenge elbow extension" }
                        }
                    },
                    { "feedbackParameters", new Dictionary<string, object>
                        {
                            { "time", "Time required to complete a set number of repetitions" },
                            { "numberOfRepetitions", "Number of marbles/beans poured within a set period of time" }
                        }
                    },
                    { "movementsEmphasized", new[] { "Grasp", "Wrist extension", "Forearm supination / pronation", "Elbow extension and shoulder flexion" } },
                    { "feasibilityNotes", "Challenging. For good repetition counting, we need to detect cup, marbles, and container." },
                    { "analysisType", "pouring" },
                    { "analysisParameters", new Dictionary<string, object>
                        {
                            { "timeLimit", 480 }
                        }
                    }
                },
                cancellationToken);

            // Seed ShapingTask32 (Cones)
            await EnsureTemplateAsync(
                "ShapingTask32",
                "Shaping Task 32",
                TaskType.ShapingTask,
                "Cones",
                "Cones and masking tape are used for this task. Cones are placed on the table individually or in a stack. The subject is asked to move cones from one position and stack them in another. As the subject progresses he should try to get the hand farther around the cone.",
                new Dictionary<string, object>
                {
                    { "taskNumber", 32 },
                    { "displayName", "Cones" },
                    { "instructions", "Move cones from one position and stack them in another. As you progress, try to get your hand farther around the cone. Also try to turn the wrist so that you can stack the cones more cleanly as well as release them more easily." },
                    { "progressionParameters", new Dictionary<string, object>
                        {
                            { "number", "Add more cones to challenge the subject's endurance" },
                            { "distance", "Move the start and stop position of the cones farther apart to challenge elbow extension and horizontal shoulder abduction/adduction" },
                            { "height", "Place the cones on a box to challenge shoulder flexion" }
                        }
                    },
                    { "feedbackParameters", new Dictionary<string, object>
                        {
                            { "numberOfRepetitions", "The number of cones placed in a set period of time" },
                            { "time", "The amount of time used to place a set number of cones" }
                        }
                    },
                    { "movementsEmphasized", new[] { "Forearm supination", "Wrist extension", "Elbow extension", "Shoulder flexion / adduction / abduction" } },
                    { "feasibilityNotes", "Requires detection of cones and stacking positions. Can be challenging depending on camera angle." },
                    { "analysisType", "cone_stacking" },
                    { "goalMode", "repsInTime" },
                    { "targetCones", 0 },
                    { "targetReps", 0 },
                    { "analysisParameters", new Dictionary<string, object>
                        {
                            { "goalMode", "repsInTime" },
                            { "timeLimit", 300 },
                            { "targetCones", 0 },
                            { "targetReps", 0 }
                        }
                    }
                },
                cancellationToken);

            // Seed ShapingTask33 (Placing Balls)
            await EnsureTemplateAsync(
                "ShapingTask33",
                "Shaping Task 33",
                TaskType.ShapingTask,
                "Placing Balls",
                "Tennis, golf, or Ping-Pong balls and a container are used for this task. Balls are placed on the table and the subject is asked to pick them up one at a time and place them in a container. If subject has trouble picking up the balls because they roll too easily, the balls can be placed on a towel to slow them down.",
                new Dictionary<string, object>
                {
                    { "taskNumber", 33 },
                    { "displayName", "Placing Balls" },
                    { "instructions", "Pick up the balls one at a time and place them in a container. The type of grasp used will be requested by the therapist depending upon what function or movement is emphasized. If you have trouble picking up the balls because they roll too easily, the balls can be placed on a towel to slow them down." },
                    { "progressionParameters", new Dictionary<string, object>
                        {
                            { "sizeOfObject", "Decrease the size of the opening of the container to challenge control of movement" },
                            { "number", "Increase the number of balls to challenge the subject's endurance" },
                            { "distance", "Move the container farther away forward or laterally to challenge elbow extension and/or shoulder horizontal abduction/adduction" },
                            { "height", "Place container on a box to challenge shoulder flexion" }
                        }
                    },
                    { "feedbackParameters", new Dictionary<string, object>
                        {
                            { "numberOfRepetitions", "Number of balls placed in the container in a set period of time" },
                            { "time", "Time required to place a certain number of balls in the container" }
                        }
                    },
                    { "movementsEmphasized", new[] { "Various grasps", "Elbow extension", "Shoulder flexion", "Shoulder horizontal abduction/adduction" } },
                    { "feasibilityNotes", "Naive solution: hand detection + zone setup. Better solution: grasp type detection." },
                    { "analysisType", "ball_placement" },
                    { "analysisParameters", new Dictionary<string, object>
                        {
                            { "timeLimit", 480 }
                        }
                    }
                },
                cancellationToken);

            // Seed ShapingTask34 (Clothes Pin On Rack)
            await EnsureTemplateAsync(
                "ShapingTask34",
                "Shaping Task 34",
                TaskType.ShapingTask,
                "Clothes Pin On Rack",
                "A rectangular cake rack and a set of clothespins are used for this task. The rack can either be placed horizontally on the table or affixed to a base, which provides for vertical positioning (such as tied to bolts on the bolt box). The subject is asked to either place clothespins on the rack, or to take them off, or both.",
                new Dictionary<string, object>
                {
                    { "taskNumber", 34 },
                    { "displayName", "Clothes Pin On Rack" },
                    { "instructions", "Place clothespins on the rack, or take them off, or both. The rack can either be placed horizontally on the table or affixed to a base for vertical positioning." },
                    { "progressionParameters", new Dictionary<string, object>
                        {
                            { "number", "Increase number of clothespins to challenge the subject's endurance" },
                            { "distance", "Move the cake rack farther away to challenge elbow extension" },
                            { "height", "Place the cake rack on a box to challenge shoulder flexion" }
                        }
                    },
                    { "feedbackParameters", new Dictionary<string, object>
                        {
                            { "numberOfRepetitions", "Number of clothes pins placed in a set period of time" },
                            { "time", "Time required to place a set number of clothes pins" }
                        }
                    },
                    { "movementsEmphasized", new[] { "Lateral pincer grasp", "Supination / pronation", "Elbow extension", "Shoulder flexion" } },
                    { "feasibilityNotes", "Naive solution: hand detection + zone setup. Better solution: pincer grasp detection." },
                    { "analysisType", "clothespin_placement" },
                    { "analysisParameters", new Dictionary<string, object>
                        {
                            { "timeLimit", 420 }
                        }
                    }
                },
                cancellationToken);

            _logger?.LogInformation("Task template seed completed.");
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Error during task template seed");
            throw;
        }
    }

    private async Task EnsureTemplateAsync(
        string templateId,
        string templateName,
        TaskType taskType,
        string name,
        string? description,
        Dictionary<string, object> properties,
        CancellationToken cancellationToken)
    {
        var existing = await _db.TaskTemplates.Find(x => x.Id == templateId).FirstOrDefaultAsync(cancellationToken);
        if (existing != null)
        {
            _logger?.LogInformation($"Task template {templateName} already exists, skipping.");
            return;
        }

        // Convert properties dictionary to BsonDocument
        var bsonProperties = new BsonDocument();
        foreach (var kvp in properties)
        {
            bsonProperties[kvp.Key] = ConvertToBsonValue(kvp.Value);
        }

        var template = new TaskTemplateEntity
        {
            Id = templateId,
            TemplateName = templateName,
            TaskType = taskType,
            Name = name,
            Description = description,
            Properties = bsonProperties,
            IsActive = true,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };

        await _db.TaskTemplates.InsertOneAsync(template, cancellationToken: cancellationToken);
        _logger?.LogInformation($"Created task template: {templateName}");
    }

    private static BsonValue ConvertToBsonValue(object? value)
    {
        if (value == null)
            return BsonNull.Value;

        return value switch
        {
            string str => new BsonString(str),
            int i => new BsonInt32(i),
            long l => new BsonInt64(l),
            double d => new BsonDouble(d),
            float f => new BsonDouble(f),
            bool b => new BsonBoolean(b),
            Dictionary<string, object> dict => ConvertDictionaryToBsonDocument(dict),
            IEnumerable<object> list => new BsonArray(list.Select(ConvertToBsonValue)),
            _ => new BsonString(value.ToString() ?? "")
        };
    }

    private static BsonDocument ConvertDictionaryToBsonDocument(Dictionary<string, object> dict)
    {
        var doc = new BsonDocument();
        foreach (var kvp in dict)
        {
            doc[kvp.Key] = ConvertToBsonValue(kvp.Value);
        }
        return doc;
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
}
