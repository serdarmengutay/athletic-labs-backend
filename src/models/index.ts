import { Sequelize } from "sequelize";
import sequelize from "../config/database";

// Import models
import Club from "./Club";
import Athlete from "./Athlete";
import TestSession from "./TestSession";
import TestResult from "./TestResult";
import PercentileResult from "./PercentileResult";
import Coach from "./Coach";
import StationTest from "./StationTest";
import Station from "./Station";
import StationTestResult from "./StationTestResult";

// Define associations
Club.hasMany(Athlete, { foreignKey: "club_id", as: "athletes" });
Athlete.belongsTo(Club, { foreignKey: "club_id", as: "club" });

Club.hasMany(TestSession, { foreignKey: "club_id", as: "testSessions" });
TestSession.belongsTo(Club, { foreignKey: "club_id", as: "club" });

Athlete.hasMany(TestResult, { foreignKey: "athlete_id", as: "testResults" });
TestResult.belongsTo(Athlete, { foreignKey: "athlete_id", as: "athlete" });

TestSession.hasMany(TestResult, {
  foreignKey: "test_session_id",
  as: "testResults",
});
TestResult.belongsTo(TestSession, {
  foreignKey: "test_session_id",
  as: "testSession",
});

TestResult.hasOne(PercentileResult, {
  foreignKey: "test_result_id",
  as: "percentileResult",
});
PercentileResult.belongsTo(TestResult, {
  foreignKey: "test_result_id",
  as: "testResult",
});

Athlete.hasMany(PercentileResult, {
  foreignKey: "athlete_id",
  as: "percentileResults",
});
PercentileResult.belongsTo(Athlete, {
  foreignKey: "athlete_id",
  as: "athlete",
});

// Coach associations
Coach.hasMany(StationTest, { foreignKey: "coach_id", as: "stationTests" });
StationTest.belongsTo(Coach, { foreignKey: "coach_id", as: "coach" });

// StationTest associations
TestSession.hasMany(StationTest, {
  foreignKey: "session_id",
  as: "stationTests",
});
StationTest.belongsTo(TestSession, {
  foreignKey: "session_id",
  as: "testSession",
});

Athlete.hasMany(StationTest, { foreignKey: "athlete_id", as: "stationTests" });
StationTest.belongsTo(Athlete, { foreignKey: "athlete_id", as: "athlete" });

// Station associations
Station.hasMany(StationTestResult, {
  foreignKey: "station_id",
  as: "testResults",
});
StationTestResult.belongsTo(Station, {
  foreignKey: "station_id",
  as: "station",
});

// StationTestResult associations
TestSession.hasMany(StationTestResult, {
  foreignKey: "test_session_id",
  as: "stationTestResults",
});
StationTestResult.belongsTo(TestSession, {
  foreignKey: "test_session_id",
  as: "testSession",
});

Athlete.hasMany(StationTestResult, {
  foreignKey: "athlete_id",
  as: "stationTestResults",
});
StationTestResult.belongsTo(Athlete, {
  foreignKey: "athlete_id",
  as: "athlete",
});

Coach.hasMany(StationTestResult, {
  foreignKey: "coach_id",
  as: "stationTestResults",
});
StationTestResult.belongsTo(Coach, { foreignKey: "coach_id", as: "coach" });

export {
  sequelize,
  Club,
  Athlete,
  TestSession,
  TestResult,
  PercentileResult,
  Coach,
  StationTest,
  Station,
  StationTestResult,
};
