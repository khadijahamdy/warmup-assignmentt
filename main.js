
const fs = require("fs");
// ============================================================
// Function 1: getShiftDuration(startTime, endTime)
// startTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// endTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// Returns: string formatted as h:mm:ss
// ============================================================
function getShiftDuration(startTime, endTime) {
    let start = new Date("1970-01-01 " + startTime);
    let end = new Date("1970-01-01 " + endTime);
    let diff = (end - start) / 1000;

    let h = Math.floor(diff / 3600);
    let m = Math.floor((diff % 3600) / 60);
    let s = diff % 60;

    return h + ":" + m.toString().padStart(2,"0") + ":" + s.toString().padStart(2,"0");
}

// ============================================================
// Function 2: getIdleTime(startTime, endTime)
// startTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// endTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// Returns: string formatted as h:mm:ss
// ============================================================
function getIdleTime(startTime, endTime) {

    function toSeconds(time){
        let [t,ampm] = time.split(" ");
        let [h,m,s] = t.split(":").map(Number);

        if(ampm === "pm" && h !== 12) h += 12;
        if(ampm === "am" && h === 12) h = 0;

        return h*3600 + m*60 + s;
    }

    let start = toSeconds(startTime);
    let end = toSeconds(endTime);

    let idle = 0;

    let startLimit = 8*3600;
    let endLimit = 22*3600;

    if(start < startLimit){
        idle += Math.min(end,startLimit) - start;
    }

    if(end > endLimit){
        idle += end - Math.max(start,endLimit);
    }

    let h = Math.floor(idle/3600);
    let m = Math.floor((idle%3600)/60);
    let s = idle%60;

    return h + ":" + m.toString().padStart(2,"0") + ":" + s.toString().padStart(2,"0");
}

 // ============================================================
// Function 3: getActiveTime(shiftDuration, idleTime)
// shiftDuration: (typeof string) formatted as h:mm:ss
// idleTime: (typeof string) formatted as h:mm:ss
// Returns: string formatted as h:mm:ss
// ============================================================
function getActiveTime(shiftDuration, idleTime) {
    function toSeconds(str) {
        let [h,m,s] = str.split(":").map(Number);
        return h*3600 + m*60 + s;
    }
    let shiftSeconds = toSeconds(shiftDuration);
    let idleSeconds = toSeconds(idleTime);
    let activeSeconds = shiftSeconds - idleSeconds;

    let h = Math.floor(activeSeconds / 3600);
    let m = Math.floor((activeSeconds % 3600) / 60);
    let s = activeSeconds % 60;

    return h + ":" + m.toString().padStart(2,"0") + ":" + s.toString().padStart(2,"0");
}

// ============================================================
// Function 4: metQuota(date, activeTime)
// date: (typeof string) formatted as yyyy-mm-dd
// activeTime: (typeof string) formatted as h:mm:ss
// Returns: boolean
// ============================================================
function metQuota(dateStr, activeTime) {

    let d = new Date(dateStr);
    let month = d.getMonth() + 1;
    let day = d.getDate();

    let [h,m,s] = activeTime.split(":").map(Number);
    let activeSeconds = h*3600 + m*60 + s;

    let required;

    if(month === 4 && day >= 10 && day <= 20){
        required = 6*3600;
    } else {
        required = 8*3600;
    }

    return activeSeconds >= required;
}

// ============================================================
// Function 5: addShiftRecord(textFile, shiftObj)
// textFile: (typeof string) path to shifts text file
// shiftObj: (typeof object) has driverID, driverName, date, startTime, endTime
// Returns: object with 10 properties or empty object {}
// ============================================================
function addShiftRecord(file, obj) {
    let data = fs.readFileSync(file,"utf8").trim().split("\n");
   let exists = data.some(line => {
    let parts = line.split(",");
    return parts[0] === obj.driverID && parts[2] === obj.date;
});
    if (exists) return {};

    let shiftDuration = getShiftDuration(obj.startTime, obj.endTime);
    let idleTime = getIdleTime(obj.startTime, obj.endTime);
    let activeTime = getActiveTime(shiftDuration, idleTime);

    let record = {
        driverID: obj.driverID,
        driverName: obj.driverName,
        date: obj.date,
        startTime: obj.startTime,
        endTime: obj.endTime,
        shiftDuration: shiftDuration,
        idleTime: idleTime,
        activeTime: activeTime,
        metQuota: metQuota(obj.date, activeTime),
        hasBonus: false
    };

    fs.appendFileSync(file, Object.values(record).join(",") + "\n");
    return record;
}


// ============================================================
// Function 6: setBonus(textFile, driverID, date, newValue)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// date: (typeof string) formatted as yyyy-mm-dd
// newValue: (typeof boolean)
// Returns: nothing (void)
// ============================================================
function setBonus(file, driverID, date, bonusFlag) {
    let data = fs.readFileSync(file,"utf8").trim().split("\n");
    let newData = data.map(line => {
        let parts = line.split(",");
        if (parts[0] === driverID && parts[2] === date) {
            parts[9] = bonusFlag ? "true" : "false";
        }
        return parts.join(",");
    });
    fs.writeFileSync(file, newData.join("\n"));
}

// ============================================================
// Function 7: countBonusPerMonth(textFile, driverID, month)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// month: (typeof string) formatted as mm or m
// Returns: number (-1 if driverID not found)
// ============================================================
function countBonusPerMonth(file, driverID, month) {
    let data = fs.readFileSync(file,"utf8").trim().split("\n");
    let count = 0;
    let found = false;

    for (let line of data) {
        let parts = line.split(",");
        if (parts[0] === driverID) {
            found = true;
           let recordMonth = Number(parts[2].split("-")[1]);
            if (recordMonth == month && parts[9] === "true") {
                count++;
            }
        }
    }
    return found ? count : -1;
}

// ============================================================
// Function 8: getTotalActiveHoursPerMonth(textFile, driverID, month)
 //textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// month: (typeof number)
// Returns: string formatted as hhh:mm:ss
// ============================================================
function getTotalActiveHoursPerMonth(file, driverID, month) {
    let data = fs.readFileSync(file,"utf8").trim().split("\n");
    let totalSeconds = 0;

    for (let line of data) {
        let parts = line.split(",");
        if (parts[0] === driverID) {
            let recordMonth = Number(parts[2].split("-")[1]);
            if (recordMonth == month) {
                let [h,m,s] = parts[7].split(":").map(Number);
                totalSeconds += h*3600 + m*60 + s;
            }
        }
    }

    let h = Math.floor(totalSeconds / 3600);
    let m = Math.floor((totalSeconds % 3600) / 60);
    let s = totalSeconds % 60;
    return `${h}:${m.toString().padStart(2,"0")}:${s.toString().padStart(2,"0")}`;
}

// ============================================================
// Function 9: getRequiredHoursPerMonth(textFile, rateFile, bonusCount, driverID, month)
// textFile: (typeof string) path to shifts text file
// rateFile: (typeof string) path to driver rates text file
// bonusCount: (typeof number) total bonuses for given driver per month
// driverID: (typeof string)
// month: (typeof number)
// Returns: string formatted as hhh:mm:ss
// ============================================================
function getRequiredHoursPerMonth(shiftsFile, ratesFile, bonusCount, driverID, month) {

    let data = fs.readFileSync(ratesFile,"utf8").trim().split("\n");

    let baseSeconds = 0;

    for (let line of data) {

        let parts = line.split(",");

        if (parts[0] === driverID) {

            let time = parts[3]; // correct column

            let t = time.split(":").map(Number);

            baseSeconds = t[0]*3600 + t[1]*60 + t[2];

            break;
        }
    }

    let reduction = bonusCount * (5*3600 + 48*60);

    let requiredSeconds = baseSeconds - reduction;

    if(requiredSeconds < 0) requiredSeconds = 0;

    let h = Math.floor(requiredSeconds/3600);
    let m = Math.floor((requiredSeconds%3600)/60);
    let s = requiredSeconds%60;

    return h + ":" + m.toString().padStart(2,"0") + ":" + s.toString().padStart(2,"0");
}
// ============================================================
// Function 10: getNetPay(driverID, actualHours, requiredHours, rateFile)
// driverID: (typeof string)
// actualHours: (typeof string) formatted as hhh:mm:ss
// requiredHours: (typeof string) formatted as hhh:mm:ss
// rateFile: (typeof string) path to driver rates text file
// Returns: integer (net pay)
// ============================================================
function getNetPay(driverID, actualHours, requiredHours, rateFile) {

    let data = fs.readFileSync(rateFile,"utf8").trim().split("\n");

    let rate = 0;

    for (let line of data) {

        let parts = line.split(",");

        if (parts[0] === driverID) {

            rate = Number(parts[2]); // correct column

            break;
        }
    }

    function toHours(str){

        let t = str.split(":").map(Number);

        return t[0] + t[1]/60 + t[2]/3600;
    }

    let actual = toHours(actualHours);
    let required = toHours(requiredHours);

    let pay;

    if(actual >= required){
        pay = rate * required;
    }
    else if(actual >= required * 0.9){
        pay = rate * required;
    }
    else{
        pay = rate * actual;
    }

    return Math.floor(pay);
}

  

module.exports = {
    getShiftDuration,
    getIdleTime,
    getActiveTime,
    metQuota,
    addShiftRecord,
    setBonus,
    countBonusPerMonth,
    getTotalActiveHoursPerMonth,
    getRequiredHoursPerMonth,
    getNetPay
};



      
   



   