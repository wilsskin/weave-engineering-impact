# ENGINEERING IMPACT DASHBOARD
# SPRINT EXECUTION PLAN
# Source of Truth for Implementation Roadmap

This document defines the high-level sprint plan for implementing
the Engineering Impact Dashboard described in spec.MD.

This file exists to:
- Provide sequencing clarity
- Track sprint completion
- Ensure no requirements are skipped
- Serve as context for all future sprint prompts

IMPORTANT:
- Always reference spec.MD for scoring logic.
- Do NOT modify scoring logic unless explicitly instructed.
- Complete sprints in order.
- Each sprint must be verifiable before proceeding.

----------------------------------------------------------------
SPRINT STATUS TRACKING
----------------------------------------------------------------

[ ] Sprint 0 – Project Scaffold & Shared Foundations
[ ] Sprint 1 – GitHub Data Layer
[ ] Sprint 2 – Core Area Identification Engine
[ ] Sprint 3A – Delivery Impact
[ ] Sprint 3B – Reliability & Crisis Response
[ ] Sprint 3C – Team Acceleration
[ ] Sprint 3D – Ownership & Depth
[ ] Sprint 3E – Execution Quality
[ ] Sprint 4 – Final Aggregation & Ranking
[ ] Sprint 5 – Dashboard UI (shadcn + Radix)
[ ] Sprint 6 – Transparency, Accessibility & Validation

----------------------------------------------------------------
SPRINT 0 – PROJECT SCAFFOLD & FOUNDATIONS
----------------------------------------------------------------

Objective:
Create stable project structure and shared types before writing logic.

Checklist:

[ ] Project scaffold created
[ ] Environment variable for GitHub token configured
[ ] Folder structure created:
      - /lib
      - /services
      - /scoring
      - /components
      - /types
      - /utils
[ ] Shared Type Definitions:
      - PullRequest
      - Review
      - Issue
      - Engineer
      - PillarScores
      - FinalScore
[ ] Constants file created:
      - Label taxonomy
      - Size bucket thresholds
      - Pillar weights
      - Core area threshold (20%)
[ ] Engineer identity normalization implemented
[ ] No scoring logic implemented yet
[ ] Project builds successfully

Sprint 0 Complete When:
- App compiles
- Types exist
- No placeholder TODO errors

----------------------------------------------------------------
SPRINT 1 – GITHUB DATA LAYER
----------------------------------------------------------------

Objective:
Fetch and normalize GitHub data for last 90 days.

Checklist:

[ ] Fetch merged PRs (last 90 days)
[ ] Fetch PR reviews
[ ] Fetch PR files
[ ] Fetch issues
[ ] Normalize raw GitHub payloads into internal models
[ ] Implement caching to local JSON file
[ ] Implement force refresh flag
[ ] Log:
      - Total PR count
      - Total engineers
      - Total reviews
      - Total issues
[ ] Verify no missing critical fields

Sprint 1 Complete When:
- Data loads without runtime errors
- Logs confirm expected data volume
- Cached data can be reused

----------------------------------------------------------------
SPRINT 2 – CORE AREA IDENTIFICATION ENGINE
----------------------------------------------------------------

Objective:
Identify core codebase areas using directory prefixes.

Checklist:

[ ] Extract directory prefix from file paths
[ ] Compute PR frequency per prefix
[ ] Compute distinct contributor count per prefix
[ ] Compute bug-labeled PR share per prefix
[ ] Calculate Core Score per prefix
[ ] Rank prefixes
[ ] Select top 20% as core areas
[ ] Store core areas in accessible structure
[ ] Console log core area list

Sprint 2 Complete When:
- Core areas are clearly printed
- Core list is non-empty
- Logic matches spec.MD exactly

----------------------------------------------------------------
SPRINT 3A – DELIVERY IMPACT
----------------------------------------------------------------

Objective:
Implement Delivery Impact scoring.

Checklist:

[ ] Apply PR size buckets
[ ] Apply core multiplier
[ ] Apply feature label multiplier
[ ] Sum raw delivery values per engineer
[ ] Normalize scores 0-100
[ ] Output table of delivery scores
[ ] Validate no engineer has NaN score
[ ] Validate at least some variation exists

Sprint 3A Complete When:
- Delivery scores printed
- Normalization verified
- Matches spec.MD formulas exactly

----------------------------------------------------------------
SPRINT 3B – RELIABILITY & CRISIS RESPONSE
----------------------------------------------------------------

Objective:
Implement Reliability scoring.

Checklist:

[ ] Detect qualifying labels
[ ] Detect qualifying title keywords
[ ] Apply severity multiplier
[ ] Apply core multiplier
[ ] Add bug issue closure bonus
[ ] Sum raw reliability values per engineer
[ ] Normalize scores 0-100
[ ] Validate no overlap with delivery raw metrics
[ ] Output reliability score table

Sprint 3B Complete When:
- Reliability scores printed
- Severity multipliers applied correctly
- No unexpected zero distribution

----------------------------------------------------------------
SPRINT 3C – TEAM ACCELERATION
----------------------------------------------------------------

Objective:
Implement Team Acceleration scoring.

Checklist:

[ ] Count reviews submitted (approved + changes requested)
[ ] Cap review volume at 40
[ ] Compute total review comments
[ ] Compute log depth metric
[ ] Compute median time to first review
[ ] Invert responsiveness for scoring
[ ] Normalize components separately
[ ] Combine weighted components
[ ] Output team acceleration scores

Sprint 3C Complete When:
- Review metrics verified
- Responsiveness calculated correctly
- No division by zero errors

----------------------------------------------------------------
SPRINT 3D – OWNERSHIP & DEPTH
----------------------------------------------------------------

Objective:
Implement Ownership scoring.

Checklist:

[ ] Identify primary directory per engineer
[ ] Compute Area Focus ratio
[ ] Compute distinct active weeks in primary area
[ ] Cap sustained weeks at 12
[ ] Compute stewardship (reviews in owned area)
[ ] Normalize components
[ ] Combine weighted score
[ ] Output ownership scores

Sprint 3D Complete When:
- Primary areas correctly detected
- Sustained weeks logic verified
- Scores distributed meaningfully

----------------------------------------------------------------
SPRINT 3E – EXECUTION QUALITY
----------------------------------------------------------------

Objective:
Implement Execution Quality scoring.

Checklist:

[ ] Detect follow-up fix PRs within 14 days
[ ] Detect reverted PRs within 30 days
[ ] Detect excessive review churn
[ ] Apply penalties
[ ] Cap penalties per spec
[ ] Prevent negative scores
[ ] Normalize across engineers if required
[ ] Output execution quality scores

Sprint 3E Complete When:
- Penalties applied correctly
- No negative values
- Distribution appears reasonable

----------------------------------------------------------------
SPRINT 4 – FINAL AGGREGATION & RANKING
----------------------------------------------------------------

Objective:
Combine all pillar scores into final ranking.

Checklist:

[ ] Confirm all pillar scores exist
[ ] Apply weights from spec.MD
[ ] Compute Final Impact Score
[ ] Rank engineers descending
[ ] Implement getTopEngineers(n)
[ ] Output Top 5 list
[ ] Validate no missing engineers
[ ] Validate weights sum to 100

Sprint 4 Complete When:
- Top 5 engineers printed
- Score breakdown available per engineer

----------------------------------------------------------------
SPRINT 5 – DASHBOARD UI (SHADCN + RADIX)
----------------------------------------------------------------

Objective:
Build single-page dashboard.

Requirements:
- Use shadcn components
- Use Radix primitives where applicable
- Follow modern web design principles
- Follow accessibility best practices

Checklist:

[ ] Install and configure shadcn
[ ] Use Card components for layout
[ ] Use Table for ranked list
[ ] Use Accordion or Collapsible for drill-down
[ ] Use Tooltip for formula explanation
[ ] Use Progress or meter for pillar bars
[ ] Display raw metric values
[ ] Display pillar breakdown visually
[ ] Keyboard navigation functional
[ ] Visible focus states
[ ] Color contrast accessible
[ ] Single page layout
[ ] Load under 10 seconds

Sprint 5 Complete When:
- Top 5 visible
- Pillar breakdown visible
- Fully keyboard accessible

----------------------------------------------------------------
SPRINT 6 – TRANSPARENCY, ACCESSIBILITY & VALIDATION
----------------------------------------------------------------

Objective:
Eliminate red flags and improve clarity.

Checklist:

[ ] Show formulas on UI
[ ] Show raw counts behind each score
[ ] Provide explanation text per pillar
[ ] Add loading state
[ ] Add error state
[ ] Validate all engineers included
[ ] Verify no opaque scoring
[ ] Confirm performance acceptable
[ ] Final manual review against spec.MD

Sprint 6 Complete When:
- Dashboard clearly answers:
  "Who are the most impactful engineers and why?"
- No unexplained numbers
- Fully accessible

----------------------------------------------------------------
END OF SPRINT PLAN
----------------------------------------------------------------