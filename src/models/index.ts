import sequelize from "../config/database";

// TODO MVP: Active models
import TestSession from "./TestSession";
import Athlete from "./Athlete";
import AthleteTest from "./AthleteTest";
import Measurement from "./Measurement";
import HistoricalAthleteData from "./HistoricalAthleteData";

// TODO MVP: Commented out models - re-enable after MVP
/*
import Club from "./Club";
import TestResult from "./TestResult";
import PercentileResult from "./PercentileResult";
import Coach from "./Coach";
import StationTest from "./StationTest";
import Station from "./Station";
import StationTestResult from "./StationTestResult";
*/

// ============================================
// MVP ASSOCIATIONS
// ============================================

// TestSession <-> AthleteTest <-> Athlete
TestSession.hasMany(AthleteTest, {
  foreignKey: "test_session_id",
  as: "athleteTests",
});
AthleteTest.belongsTo(TestSession, {
  foreignKey: "test_session_id",
  as: "testSession",
});

Athlete.hasMany(AthleteTest, {
  foreignKey: "athlete_id",
  as: "athleteTests",
});
AthleteTest.belongsTo(Athlete, {
  foreignKey: "athlete_id",
  as: "athlete",
});

// AthleteTest <-> Measurement (one-to-one)
AthleteTest.hasOne(Measurement, {
  foreignKey: "athlete_test_id",
  as: "measurement",
});
Measurement.belongsTo(AthleteTest, {
  foreignKey: "athlete_test_id",
  as: "athleteTest",
});

// HistoricalAthleteData is standalone - no associations needed

// ============================================
// TODO MVP: Commented out associations
// ============================================
/*
// Club associations
Club.hasMany(Athlete, { foreignKey: "club_id", as: "athletes" });
Athlete.belongsTo(Club, { foreignKey: "club_id", as: "club" });

Club.hasMany(TestSession, { foreignKey: "club_id", as: "testSessions" });
TestSession.belongsTo(Club, { foreignKey: "club_id", as: "club" });

// TestResult associations
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

// PercentileResult associations
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
*/

export {
  sequelize,
  TestSession,
  Athlete,
  AthleteTest,
  Measurement,
  HistoricalAthleteData,
  // TODO MVP: Commented out exports
  // Club,
  // TestResult,
  // PercentileResult,
  // Coach,
  // StationTest,
  // Station,
  // StationTestResult,
};
