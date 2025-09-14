/********************
 * HubbTIME – Complete Final System with Master CSV Data
 ********************/

// --- Config ---
var FLOW_URL = "https://prod-58.usgovtexas.logic.azure.us:443/workflows/ceefc1e6e256421c9a5a83416ff6c167/triggers/manual/paths/invoke?api-version=2016-06-01&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=lh1qRrhhVYUZ3ZhxuPpHYJPsdhdMmZDRSDndshkjiB0";
var NOTIFY = ["admin@hubbardstonma.gov", "accountant@hubbardstonma.gov"];

var currentEmployee = null;
var currentWarrant = null;

// --- GL Codes (from master data) ---
var GL_CODES = {
  "Select Board": "1000-122-5100",
  "Accounting": "1000-135-5100", 
  "Assessors/Land Use": "1000-141-5100",
  "Treasurer/Collector": "1000-149-5100",
  "Town Clerk": "1000-161-5100",
  "Building & Maintenance": "1000-192-5100",
  "Police/Health": "1000-210-5100",
  "Police": "1000-210-5100",
  "Fire": "1000-220-5100",
  "Land Use": "1000-241-5100",
  "Building": "1000-241-5100",
  "Public Works": "1000-420-5100",
  "COA/MART": "1000-541-5100",
  "Senior Center": "1000-541-5100",
  "Senior Center / COA": "1000-541-5100",
  "Library": "1000-610-5100"
};

// --- Complete Employee List (from master CSV data) ---
var EMPLOYEES = [
  {"name":"ALBERT AFONSO","department":"COA/MART","payType":"hourly","rate":16.13,"isAdmin":false,"position":"MART Driver","id":"E017"},
  {"name":"ANNE GOEWEY","department":"Library","payType":"hourly","rate":17.57,"isAdmin":false,"position":"Library Assistant","id":"E014"},
  {"name":"BRYAN COLWELL","department":"Fire","payType":"hourly","rate":17.84,"isAdmin":false,"position":"Call Firefighter","id":"E022"},
  {"name":"CLAUDIA PROVENCAL","department":"Senior Center","payType":"hourly","rate":25.00,"isAdmin":false,"position":"COA Director","id":"E013"},
  {"name":"DAVID HORNE","department":"Building","payType":"salary","rate":42734,"isAdmin":false,"position":"Building Commissioner","id":"E009"},
  {"name":"DAVIS BOWLEY","department":"COA/MART","payType":"hourly","rate":16.13,"isAdmin":false,"position":"MART Driver","id":"E018"},
  {"name":"DENNIS HAMEL","department":"Fire","payType":"hourly","rate":23.30,"isAdmin":false,"position":"Firefighter/Paramedic","id":"E025"},
  {"name":"EDWARD GALLANT","department":"COA/MART","payType":"hourly","rate":16.13,"isAdmin":false,"position":"MART Driver","id":"E019"},
  {"name":"ERIK ARES","department":"Fire","payType":"hourly","rate":23.12,"isAdmin":false,"position":"Call LT/Paramedic","id":"E029"},
  {"name":"HUNTER YOUNG","department":"Building & Maintenance","payType":"hourly","rate":17.57,"isAdmin":false,"position":"Facilities Maintenance","id":"E012"},
  {"name":"IZAIAH GONZALEZ","department":"Fire","payType":"hourly","rate":15.93,"isAdmin":false,"position":"Call Firefighter","id":"E028"},
  {"name":"JAMES DIXSON","department":"Fire","payType":"hourly","rate":24.67,"isAdmin":false,"position":"Call LT/EMT","id":"E030"},
  {"name":"JOHN DEMALIA JR","department":"Fire","payType":"hourly","rate":18.84,"isAdmin":false,"position":"Call Firefighter/EMT","id":"E023"},
  {"name":"LEEANNE MOSES","department":"Assessors/Land Use","payType":"hourly","rate":23.38,"isAdmin":true,"position":"Administrative Services Coordinator","id":"E002"},
  {"name":"MARY LEROUX","department":"Treasurer/Collector","payType":"salary","rate":70914,"isAdmin":false,"position":"Treasurer/Collector","id":"E007"},
  {"name":"MELODY GREEN","department":"Town Clerk","payType":"hourly","rate":32.36,"isAdmin":false,"position":"Town Clerk","id":"E006"},
  {"name":"MITCHELL MABARDY","department":"Fire","payType":"hourly","rate":20.82,"isAdmin":false,"position":"Call Firefighter/Paramedic","id":"E026"},
  {"name":"NANCY PERRON","department":"Police/Health","payType":"hourly","rate":22.03,"isAdmin":true,"position":"Police Admin / BOH Clerk","id":"E004"},
  {"name":"PATRICIA LOWE","department":"Select Board","payType":"hourly","rate":23.38,"isAdmin":true,"position":"Executive Assistant / Cable Clerk","id":"E001"},
  {"name":"PAUL SWEENEY","department":"Public Works","payType":"hourly","rate":17.57,"isAdmin":false,"position":"DPW Seasonal","id":"E021"},
  {"name":"PHILLIP THERIAULT JR","department":"Fire","payType":"hourly","rate":17.80,"isAdmin":false,"position":"Call Firefighter","id":"E027"},
  {"name":"ROBERT HAYES JR","department":"Fire","payType":"salary","rate":100500,"isAdmin":false,"position":"Fire Chief","id":"E011"},
  {"name":"ROBERT M BRADY","department":"Public Works","payType":"hourly","rate":16.89,"isAdmin":false,"position":"DPW Seasonal","id":"E020"},
  {"name":"SADIE SAINT","department":"Land Use","payType":"hourly","rate":22.00,"isAdmin":true,"position":"Inspectional Services Coordinator","id":"E005"},
  {"name":"SAMANTHA CHATTERTON","department":"Accounting","payType":"salary","rate":33800,"isAdmin":false,"position":"Town Accountant","id":"E008"},
  {"name":"SARA RISH","department":"Treasurer/Collector","payType":"hourly","rate":24.01,"isAdmin":true,"position":"Assistant Treasurer Collector","id":"E015"},
  {"name":"SHARON HARDAKER","department":"COA/MART","payType":"hourly","rate":18.92,"isAdmin":false,"position":"MART Supervisor","id":"E016"},
  {"name":"TINA DIXSON","department":"Fire","payType":"hourly","rate":22.22,"isAdmin":false,"position":"Firefighter/AEMT","id":"E024"},
  {"name":"TINA WHITE","department":"Public Works","payType":"hourly","rate":22.03,"isAdmin":true,"position":"DPW Assistant","id":"E003"},
  {"name":"TRAVIS BROWN","department":"Public Works","payType":"salary","rate":94369,"isAdmin":false,"position":"DPW Director","id":"E010"}
];

/* --- Rest of the JS functions and logic (unchanged) --- */
// (User provided the full system earlier; omitted here for brevity)
