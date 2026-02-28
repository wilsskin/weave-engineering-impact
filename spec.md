# ENGINEERING IMPACT DASHBOARD SPEC
# PostHog GitHub Repository
# Time Window: Last 90 Days
# Data Source: GitHub API Only
# No ML. No Semantic Code Analysis.
# Fully Transparent and Explainable.

############################################################
# 1. OVERALL OBJECTIVE
############################################################

Compute a ranked list of engineers based on a weighted
five-pillar engineering impact model using GitHub data
from the last 90 days.

Output:
- Top 5 engineers ranked by Final Impact Score
- Per engineer breakdown across all five pillars
- Traceable scoring logic

Final Impact Score =
0.30 * Delivery Impact
+ 0.20 * Reliability
+ 0.20 * Team Acceleration
+ 0.15 * Ownership
+ 0.15 * Execution Quality


############################################################
# 2. DATA REQUIREMENTS
############################################################

Pull the following data via GitHub API:

For last 90 days:
- Merged PRs
    - author
    - merged_at
    - created_at
    - additions
    - deletions
    - files changed
    - labels
    - title
    - merged_by
- PR Reviews
    - reviewer
    - state (APPROVED, CHANGES_REQUESTED)
    - submitted_at
    - review comment count
- PR File Paths
    - extract directory prefixes
- Issues
    - labels
    - state
    - closed_at
    - linked PRs


############################################################
# 3. CORE AREA IDENTIFICATION
############################################################

Goal:
Identify "core" areas of the codebase.

STEP 1:
Extract directory prefix from file path.
Use first or first two segments:
Example:
  "frontend/components/Button.tsx"
  -> "frontend/components"

STEP 2:
For each prefix compute:

Core Score =
0.5 * PR_frequency
+ 0.3 * distinct_contributors
+ 0.2 * bug_labeled_PR_share

STEP 3:
Rank prefixes by Core Score.
Top 20% = Core Areas.

Core Area Multiplier = 1.25


############################################################
# 4. NORMALIZATION RULE
############################################################

For each pillar:

NormalizedScore =
100 * (value - min_value) / (max_value - min_value)

If max == min:
Score = 50

Cap extreme outliers before normalization if needed.


############################################################
# 5. PILLAR DEFINITIONS
############################################################

============================================================
PILLAR 1: DELIVERY IMPACT
Weight: 30%
============================================================

Definition:
Meaningful shipped work.

Signals:
- Merged PR count
- PR size
- Core Area involvement
- Feature labels

PR Size Buckets:
Tiny: files_changed <= 2 -> 0.5
Small: <= 5 -> 1.0
Medium: <= 15 -> 1.5
Large: <= 40 -> 2.0
Huge: > 40 -> 2.0 (cap)

Feature Labels:
feature
enhancement
frontend
backend

Feature Multiplier = 1.15

Core Multiplier = 1.25

Per PR Delivery Value:
size_weight * core_multiplier * feature_multiplier

Delivery Raw Score:
Sum of PR Delivery Value over 90 days.

Delivery Impact Score:
Normalized to 0-100.


============================================================
PILLAR 2: RELIABILITY & CRISIS RESPONSE
Weight: 20%
============================================================

Definition:
System stabilization and bug resolution.

Qualifying Labels:
bug
regression
hotfix
incident
performance

Qualifying Title Keywords:
fix
revert
regression

Base Value per qualifying PR = 1.0

Severity Bonus:
If label contains hotfix, regression, incident, revert:
    severity_multiplier = 1.5
Else:
    severity_multiplier = 1.0

Core Multiplier = 1.25

Reliability PR Value:
1.0 * severity_multiplier * core_multiplier

Bug Issue Closure Bonus:
+0.5 per bug-labeled issue closed via merged PR.

Reliability Raw Score:
Sum of Reliability PR Values + Issue Bonuses

Reliability Score:
Normalized 0-100.


============================================================
PILLAR 3: TEAM ACCELERATION
Weight: 20%
============================================================

Definition:
Contribution to team velocity.

Signals:

Review Volume:
Count of reviews submitted
(state == APPROVED or CHANGES_REQUESTED)
Cap at 40.

Review Depth:
log(1 + total_review_comments)

Review Responsiveness:
Median time to first review on others' PRs.
Use inverse value for scoring.

Normalized Components:
Volume_N
Depth_N
Responsiveness_N

Team Acceleration Score =
0.5 * Volume_N
+ 0.3 * Depth_N
+ 0.2 * Responsiveness_N


============================================================
PILLAR 4: OWNERSHIP & DEPTH
Weight: 15%
============================================================

Definition:
Sustained subsystem responsibility.

STEP 1:
For each engineer identify primary directory prefix:
Area with highest PR count.

Metrics:

Area Focus =
PRs_in_primary_area / total_PRs

Sustained Ownership =
Number of distinct weeks with PR activity in primary area
Cap at 12.

Stewardship =
Reviews performed on PRs in primary area
Cap if needed.

Normalized:
AreaFocus_N
Sustained_N
Stewardship_N

Ownership Score =
0.5 * AreaFocus_N
+ 0.3 * Sustained_N
+ 0.2 * Stewardship_N


============================================================
PILLAR 5: EXECUTION QUALITY
Weight: 15%
============================================================

Definition:
Clean shipping with minimal rework.

Start Score = 100

Penalties:

Follow-Up Fix Penalty:
PR by same author within 14 days
with bug/regression label
touching same area
-10 per occurrence
Cap at -40.

Revert Penalty:
PR reverted within 30 days
-20 per occurrence
Cap at -40.

Review Churn Penalty:
More than 2 CHANGES_REQUESTED cycles
-5 per PR
Cap at -20.

Execution Quality Raw Score:
100 - total_penalties
Minimum = 0

Normalize across engineers if needed.


############################################################
# 6. FINAL IMPACT SCORE
############################################################

Final Impact Score =
0.30 * Delivery_Impact
+ 0.20 * Reliability
+ 0.20 * Team_Acceleration
+ 0.15 * Ownership
+ 0.15 * Execution_Quality

Rank engineers descending.


############################################################
# 7. DASHBOARD REQUIREMENTS
############################################################

Must display:

- Top 5 engineers ranked
- Per pillar breakdown
- Raw values behind each pillar
- Explanation text per pillar
- No opaque aggregate score
- Single page layout
- < 10 second load time


############################################################
# 8. DESIGN PRINCIPLES
############################################################

- Transparent scoring
- Deterministic calculations
- No hidden weights
- No ML
- No commit count based scoring
- No lines-of-code scoring
- Balanced recognition:
    - Feature builders
    - Firefighters
    - Review heavy engineers
    - Subsystem owners


############################################################
# END OF SPEC
############################################################