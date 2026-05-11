# Guidr 🎓

> A cloud-native career mentorship platform connecting college students with verified professionals — built entirely on **AWS Serverless** with **15+ managed services**, event-driven architecture, distributed tracing, and AI-powered content moderation.

[![AWS](https://img.shields.io/badge/AWS-Cloud--Native-FF9900?logo=amazonaws)](https://aws.amazon.com)
[![React](https://img.shields.io/badge/Frontend-React-61DAFB?logo=react)](https://react.dev)
[![Serverless](https://img.shields.io/badge/Backend-Lambda%20%2B%20API%20Gateway-orange)](https://aws.amazon.com/lambda)
[![DynamoDB](https://img.shields.io/badge/Database-DynamoDB-4053D6?logo=amazondynamodb)](https://aws.amazon.com/dynamodb)
[![X-Ray](https://img.shields.io/badge/Tracing-AWS%20X--Ray-purple)](https://aws.amazon.com/xray)
[![Docker](https://img.shields.io/badge/Container-Docker-2496ED?logo=docker)](https://www.docker.com)
[![CDK](https://img.shields.io/badge/IaC-AWS%20CDK%20(Java)-green)](https://aws.amazon.com/cdk)

## 🌐 Live Demo

> **🚀 [https://d3k03ku5qbyly4.cloudfront.net](https://d3k03ku5qbyly4.cloudfront.net)**

| Resource | URL / Details |
|---|---|
| **Frontend** | [https://d3k03ku5qbyly4.cloudfront.net](https://d3k03ku5qbyly4.cloudfront.net) |
| **API Base URL** | `https://ms3stxtwuf.execute-api.us-east-1.amazonaws.com/prod` |
| **Region** | `us-east-1` (N. Virginia) |
| **Status** | ✅ Live & Active |

---

## 📌 Project Focus

> **Note**: This project's primary focus is on **AWS cloud architecture, infrastructure design, and DevOps practices**. The frontend serves as a functional interface to demonstrate the backend capabilities. Further frontend enhancements to match the complete product vision are planned as a future iteration.

---

## 🏗 System Architecture

Guidr is built on a **100% Serverless Microservices Architecture** using AWS, optimized to operate at **$0 monthly cost** within the AWS Free Tier. The platform leverages 15+ AWS services across compute, storage, messaging, observability, security, and CI/CD layers.

### High-Level Architecture Diagram

```mermaid
graph TD
    Client["🖥️ Browser (Student / Professional)"]

    %% ── CDN & Static Hosting ──
    subgraph Edge["🌐 Content Delivery"]
        CDN["CloudFront CDN"]
        S3_FE[("S3 Static Bucket")]
    end

    %% ── API Layer ──
    subgraph APILayer["🔀 API Layer"]
        APIGW["API Gateway (REST)"]
        CogAuth["Cognito Authorizer"]
        CORS["OPTIONS Preflight"]
    end

    %% ── Identity ──
    subgraph Identity["🔐 Identity & Access"]
        UserPool["Cognito User Pool"]
        IAM["IAM Roles & Policies"]
    end

    %% ── Compute: Microservices ──
    subgraph Compute["⚡ Compute Layer — Lambda Microservices"]
        L_Auth("guidr-auth-service")
        L_Users("guidr-users-service")
        L_Questions("guidr-questions-service")
        L_Answers("guidr-answers-service")
        L_Notif("guidr-notification-worker")
    end

    %% ── Storage ──
    subgraph Storage["💾 Database Layer — DynamoDB"]
        DB_Users[("guidr-users")]
        DB_Questions[("guidr-questions")]
        DB_Answers[("guidr-answers")]
    end

    %% ── Messaging ──
    subgraph Messaging["📨 Event-Driven Messaging"]
        EventBus["EventBridge Bus"]
        SQS["SQS Notification Queue"]
        SNS(("SNS Topic"))
        SES["SES Email Delivery"]
    end

    %% ── Observability ──
    subgraph Observability["📊 Observability & Monitoring"]
        XRay["AWS X-Ray"]
        RUM["CloudWatch RUM"]
        CWDash["CloudWatch Dashboards"]
        CWLogs["CloudWatch Logs"]
    end

    %% ── Configuration ──
    subgraph Config["⚙️ Configuration Management"]
        SSM["SSM Parameter Store"]
        Budgets["AWS Budgets"]
    end

    %% ── AI ──
    subgraph AI["🤖 AI / ML"]
        Rekog["Amazon Rekognition"]
    end

    %% ── DevOps ──
    subgraph DevOps["🔄 CI/CD Pipeline"]
        CP["CodePipeline"]
        CB["CodeBuild"]
        GH["GitHub (Source)"]
    end

    %% ── IaC ──
    subgraph IaC["🏗️ Infrastructure as Code"]
        CDK["AWS CDK (Java)"]
        Docker["Docker Containers"]
    end

    %% ── Connections ──
    Client -->|"Loads React SPA"| CDN
    CDN --> S3_FE
    Client -.->|"Login / Signup"| UserPool
    Client -->|"REST API Calls"| APIGW
    APIGW <-->|"Validates JWT"| CogAuth
    CogAuth <--> UserPool
    APIGW <--> CORS

    APIGW -->|"GET, POST /auth"| L_Auth
    APIGW -->|"GET, PUT /users"| L_Users
    APIGW -->|"GET, POST /questions"| L_Questions
    APIGW -->|"GET, POST, PUT /answers"| L_Answers

    L_Auth <--> DB_Users
    L_Users <--> DB_Users
    L_Questions <--> DB_Questions
    L_Answers <--> DB_Answers
    L_Answers <--> DB_Questions

    L_Questions -->|"Publishes Event"| EventBus
    L_Questions -->|"Async Message"| SQS
    L_Answers -->|"Async Message"| SQS
    EventBus -->|"Routes to"| SQS

    SQS -->|"Triggers"| L_Notif
    L_Notif -->|"Fan-out"| SNS
    L_Notif -->|"Direct Email"| SES
    SNS -.->|"Notifications"| Client

    L_Users -.->|"AI Moderation"| Rekog

    Compute -.->|"Traces"| XRay
    Client -.->|"Telemetry"| RUM
    Compute -.->|"Logs"| CWLogs
    Compute -.->|"Fetches Config"| SSM

    GH -->|"Push to main"| CP
    CP --> CB
    CB -->|"Deploys"| Compute
    CB -->|"Deploys"| S3_FE

    CDK -.->|"Provisions"| Compute
    Docker -.->|"Packages"| L_Questions
```

---

## 🔄 Core Data Flow: "Post a Question" (End-to-End)

This sequence diagram illustrates how a single user action flows through the entire platform — from the browser, through 7 AWS services, all the way to an email notification.

```mermaid
sequenceDiagram
    participant User as 🖥️ React Frontend
    participant RUM as 📊 CloudWatch RUM
    participant Cognito as 🔐 Cognito
    participant APIGW as 🔀 API Gateway
    participant Lambda as ⚡ questions-service
    participant SSM as ⚙️ SSM Parameter Store
    participant DDB as 💾 DynamoDB
    participant EB as 📨 EventBridge
    participant SQS as 📬 SQS Queue
    participant Notif as 📧 notification-worker
    participant SNS as 📢 SNS Topic
    participant SES as ✉️ SES
    participant XRay as 🔍 X-Ray

    User->>RUM: Page load telemetry captured
    User->>Cognito: 1. Authenticate (email/password)
    Cognito-->>User: JWT Token (idToken)

    User->>APIGW: 2. POST /questions (Bearer token)
    APIGW->>Cognito: 3. Validate JWT
    Cognito-->>APIGW: ✅ Valid

    APIGW->>Lambda: 4. Invoke Lambda
    Lambda->>XRay: Start trace segment
    Lambda->>SSM: 5. Fetch QUESTIONS_TABLE (cached)
    SSM-->>Lambda: "guidr-questions"

    Lambda->>DDB: 6. PutItem (question record)
    DDB-->>Lambda: ✅ Success

    Lambda->>SQS: 7. SendMessage (NEW_QUESTION)
    Lambda->>EB: 8. PutEvents (QuestionCreated)
    EB-->>SQS: 9. Rule routes event to queue

    Lambda->>XRay: Close trace segment
    Lambda-->>APIGW: 10. 201 Created
    APIGW-->>User: Response displayed

    Note over SQS: ⏳ Async Processing

    SQS->>Notif: 11. Triggers notification-worker
    Notif->>SSM: 12. Fetch SNS_TOPIC_ARN
    Notif->>SNS: 13. Publish notification
    Notif->>SES: 14. Send email to subscribers
    SES-->>User: 📧 Email delivered
```

---

## 🔄 Notification Flow: "Answer Posted" (Event-Driven)

```mermaid
sequenceDiagram
    participant Pro as 🧑‍💼 Professional
    participant APIGW as 🔀 API Gateway
    participant Ans as ⚡ answers-service
    participant DDB as 💾 DynamoDB
    participant SQS as 📬 SQS Queue
    participant Notif as 📧 notification-worker
    participant SES as ✉️ SES
    participant Student as 🎓 Question Author

    Pro->>APIGW: POST /answers (answerId, body)
    APIGW->>Ans: Invoke Lambda
    Ans->>DDB: PutItem (answer) + Update answerCount
    Ans->>SQS: SendMessage (NEW_ANSWER)
    Ans-->>APIGW: 201 Created

    SQS->>Notif: Trigger worker
    Notif->>SES: Send styled HTML email
    SES-->>Student: 📧 "Your question got an answer!"
```

---

## ☁️ AWS Services Used (15+ Services)

| Category | Service | Purpose | Free Tier |
|---|---|---|---|
| **Compute** | AWS Lambda | 5 microservices (Node.js 18) | 1M requests/month |
| **API** | API Gateway (REST) | Request routing + CORS + JWT auth | 1M calls/month |
| **Database** | DynamoDB | 3 tables (Users, Questions, Answers) | 25GB + 25 WCU/RCU |
| **Auth** | Cognito User Pool | Email/password authentication + JWT | 50K MAU |
| **CDN** | CloudFront | Global SPA distribution | 1TB transfer/month |
| **Storage** | S3 | Frontend static hosting | 5GB |
| **Messaging** | SQS | Async notification queue | 1M requests/month |
| **Messaging** | SNS | Fan-out notification delivery | 1M publishes/month |
| **Email** | SES | Transactional email delivery | 3K/month |
| **Events** | EventBridge | Event-driven service decoupling | 1M events/month |
| **AI/ML** | Rekognition | Profile image content moderation | 5K images/month |
| **Tracing** | X-Ray | Distributed tracing across services | 100K traces/month |
| **Monitoring** | CloudWatch RUM | Real user frontend performance | Free Tier |
| **Monitoring** | CloudWatch Dashboards | System health visualization | 3 dashboards free |
| **Config** | SSM Parameter Store | Dynamic runtime configuration | Free (Standard) |
| **Cost** | AWS Budgets | Spending alerts ($1 threshold) | 2 budgets free |
| **CI/CD** | CodePipeline + CodeBuild | Automated deployment on push | 1 pipeline free |
| **IaC** | AWS CDK (Java) | Infrastructure as Code | Free (tooling) |
| **Container** | Docker | Lambda container packaging | Free (local) |

---

## 📁 Project Structure

```text
Guidr/
├── frontend/                          # React SPA (Vite + React Router)
│   ├── src/
│   │   ├── api/                       # Axios HTTP clients with Cognito tokens
│   │   ├── components/                # Reusable UI components
│   │   ├── context/AuthContext.jsx     # Global authentication state
│   │   ├── pages/                     # Route-level page layouts
│   │   ├── main.jsx                   # Entry point + CloudWatch RUM integration
│   │   └── App.jsx                    # React Router configuration
│   └── package.json
│
├── backend/
│   └── lambdas/                       # Node.js 18 Serverless Microservices
│       ├── auth-service/              # Cognito Post-Confirmation + GET /auth/me
│       ├── users-service/             # User profiles + Rekognition AI moderation
│       ├── questions-service/         # Q&A CRUD + EventBridge + SQS publishing
│       │   └── Dockerfile             # Container image for Lambda deployment
│       ├── answers-service/           # Answer CRUD + SQS notifications
│       └── notification-worker/       # SQS → SNS → SES email pipeline
│
├── guidr-infra-cdk/                   # AWS CDK (Java) — Infrastructure as Code
│   ├── src/main/java/com/myorg/
│   │   ├── GuidrInfraCdkApp.java      # CDK application entry point
│   │   └── GuidrInfraCdkStack.java    # Stack: EventBridge + Docker Lambda + IAM
│   └── pom.xml                        # Maven dependencies
│
├── deployment/                        # Automation scripts
│   ├── deploy-lambdas.sh              # Packages and deploys all 5 Lambda functions
│   ├── deploy-frontend.sh             # Builds React app and syncs to S3 + CloudFront
│   ├── setup-aws.sh                   # Initial AWS infrastructure provisioning
│   └── update-lambdas-code.sh         # Quick code-only Lambda updates
│
├── infrastructure/
│   └── dynamodb-tables.json           # DynamoDB table definitions
│
├── buildspec.yml                      # AWS CodeBuild CI/CD specification
└── README.md
```

---

## ⚡ Complete API Reference

All routes deployed on AWS API Gateway in `us-east-1` region.

| Method | Route | Auth | Lambda Target | Description |
|---|---|---|---|---|
| `POST` | `/auth` | No | `guidr-auth-service` | Post-Confirmation profile creation |
| `GET` | `/auth/me` | ✅ Cognito JWT | `guidr-auth-service` | Get current user profile |
| `GET` | `/users` | ✅ Cognito JWT | `guidr-users-service` | Search/list professionals |
| `GET` | `/users/{id}` | No | `guidr-users-service` | Get public profile |
| `PUT` | `/users/{id}` | ✅ Cognito JWT | `guidr-users-service` | Update own profile |
| `GET` | `/questions` | No | `guidr-questions-service` | List all questions (with filters) |
| `POST` | `/questions` | ✅ Cognito JWT | `guidr-questions-service` | Post a new question |
| `GET` | `/questions/{id}` | No | `guidr-questions-service` | View single question |
| `GET` | `/answers?questionId=` | No | `guidr-answers-service` | List answers for a question |
| `POST` | `/answers` | ✅ Cognito JWT | `guidr-answers-service` | Post an answer |
| `PUT` | `/answers/{id}/upvote` | ✅ Cognito JWT | `guidr-answers-service` | Upvote an answer |

> All routes include CORS `OPTIONS` preflight handlers for cross-origin browser requests.

---

## 🔐 Authentication Flow

```mermaid
graph LR
    A["User Signs Up"] --> B["Cognito User Pool"]
    B --> C["Email Verification"]
    C --> D["Post-Confirmation Trigger"]
    D --> E["auth-service Lambda"]
    E --> F["Creates Profile in DynamoDB"]
    F --> G["User Logged In with JWT"]
    G --> H["All API calls include Bearer Token"]
    H --> I["API Gateway validates via Cognito Authorizer"]
```

---

## 📊 Observability Stack

### End-to-End Tracing (Frontend → Backend)

```mermaid
graph LR
    A["🖥️ Browser"] -->|"CloudWatch RUM"| B["Frontend Metrics"]
    B -->|"enableXRay: true"| C["X-Ray Traces"]
    C --> D["API Gateway Segment"]
    D --> E["Lambda Segment"]
    E --> F["DynamoDB Subsegment"]
    E --> G["SQS Subsegment"]
    E --> H["SSM Subsegment"]
```

| Layer | Tool | What It Tracks |
|---|---|---|
| **Frontend** | CloudWatch RUM | Page load times, JS errors, user sessions, Core Web Vitals |
| **API** | X-Ray + API Gateway | Request latency, error rates, throttling |
| **Backend** | X-Ray + Lambda | Cold starts, execution duration, downstream calls |
| **Database** | X-Ray + DynamoDB | Read/write latency per table |
| **Dashboard** | CloudWatch | Aggregated error rates, traffic volume, p90 latency |

---

## 🔄 CI/CD Pipeline

```mermaid
graph LR
    A["Developer pushes to GitHub (main)"] --> B["CodePipeline triggers"]
    B --> C["CodeBuild executes buildspec.yml"]
    C --> D["Install Node.js 18 + dependencies"]
    D --> E["Build & Deploy Lambda functions"]
    E --> F["Build React SPA + Sync to S3"]
    F --> G["CloudFront serves updated frontend"]
```

---

## 👤 User Roles

| Role | Capabilities |
|---|---|
| **Student** | Ask questions, browse professionals, upvote answers, receive email notifications |
| **Professional** | Answer questions, share expertise, build reputation, receive new question alerts |

---

## 🚀 Live Environment

| Resource | Details |
|---|---|
| **Frontend CDN** | `https://d3k03ku5qbyly4.cloudfront.net` |
| **Region** | `us-east-1` (N. Virginia) |
| **Observability** | CloudWatch RUM + X-Ray (Active Tracing) |
| **Configuration** | SSM Parameter Store (Dynamic) |
| **Event Bus** | EventBridge (`guidr-event-bus`) |
| **Cost** | **$0.00/month** (AWS Free Tier optimized) |
| **Budget Alert** | Email notification at 80% of $1.00 threshold |
| **CI/CD** | CodePipeline → CodeBuild (auto-deploy on push) |

---

## 🚀 Deployment Guide

Guidr uses a **dual deployment strategy**: automated CI/CD for every Git push, and manual scripts for targeted updates.

### Strategy 1: Automated CI/CD (Recommended)

Every push to the `main` branch on GitHub triggers the full pipeline automatically.

```mermaid
graph LR
    A["git push → GitHub main"] --> B["CodePipeline triggers"]
    B --> C["CodeBuild: buildspec.yml"]
    C --> D["Install Node.js 18 + zip + jq"]
    D --> E["deploy-lambdas.sh → 5 Lambda functions updated"]
    E --> F["deploy-frontend.sh → React build → S3 sync"]
    F --> G["CloudFront cache invalidated"]
    G --> H["✅ Live at CloudFront URL"]
```

**Trigger a deployment:**
```bash
git add . && git commit -m "your message" && git push origin main
# AWS CodePipeline picks this up automatically within ~30 seconds
```

---

### Strategy 2: Manual Deployment Scripts

Use these for quick updates without waiting for the full pipeline.

#### Step 1 — Prerequisites
```bash
# AWS CLI must be configured
aws configure   # Enter Access Key, Secret, Region: us-east-1

# Verify identity
aws sts get-caller-identity
```

#### Step 2 — Deploy all 5 Lambda Microservices
```bash
# Makes script executable (Linux/Mac/Git Bash)
chmod +x deployment/deploy-lambdas.sh

# Deploys: auth, users, questions, answers, notification-worker
# Also configures: API Gateway routes, SQS trigger, Cognito authorizer
./deployment/deploy-lambdas.sh
```

What this script does:
- Packages each Lambda as a `.zip` with `npm install --omit=dev`
- Creates or updates the Lambda function in `us-east-1`
- Configures environment variables (table names, SQS URL, SNS ARN)
- Creates API Gateway routes and maps them to each Lambda
- Attaches the Cognito authorizer to protected routes
- Deploys API Gateway to the `prod` stage
- Configures the SQS event source for the notification-worker

#### Step 3 — Deploy the React Frontend
```bash
chmod +x deployment/deploy-frontend.sh
./deployment/deploy-frontend.sh
```

What this script does:
- Runs `npm run build` to create the production Vite bundle
- Syncs static assets to S3 with long-term cache headers (`max-age=31536000`)
- Uploads `index.html` with `no-cache` headers (critical for SPA routing)
- Invalidates the CloudFront cache (`/*`) so users get the latest version immediately

#### Quick Lambda-only Update (No API Gateway changes)
```bash
# Fastest option — just re-zips and pushes code, skips API Gateway
./deployment/update-lambdas-code.sh
```

---

### Strategy 3: Infrastructure as Code (AWS CDK — Java)

For full infrastructure provisioning (Event Bus, Docker Lambda, IAM policies):

```bash
cd guidr-infra-cdk

# First time only — bootstraps CDK in your AWS account
npx cdk bootstrap

# Preview what will be deployed
npx cdk diff

# Deploy the stack (requires Docker Desktop running)
npx cdk deploy
```

The CDK stack (`GuidrInfraCdkStack.java`) provisions:
- **EventBridge Bus** (`guidr-event-bus-cdk`)
- **Docker Image Lambda** — builds the `questions-service` Dockerfile and deploys as a container
- **IAM Policies** — `events:PutEvents` + `rekognition:DetectModerationLabels` automatically attached

---

### Environment Variables Reference

Set these in **AWS CodeBuild → Environment Variables** or your local `.env`:

| Variable | Description | Example |
|---|---|---|
| `VITE_API_URL` | API Gateway base URL | `https://ms3stxtwuf.execute-api.us-east-1.amazonaws.com/prod` |
| `VITE_COGNITO_USER_POOL_ID` | Cognito User Pool ID | `us-east-1_xxxxxxxx` |
| `VITE_COGNITO_CLIENT_ID` | Cognito App Client ID | `xxxxxxxxxxxxxxxxxx` |
| `VITE_COGNITO_REGION` | AWS Region | `us-east-1` |

Lambda environment variables are managed via **SSM Parameter Store** at runtime:

| SSM Path | Value | Used By |
|---|---|---|
| `/guidr/config/QUESTIONS_TABLE` | `guidr-questions` | questions-service |
| `/guidr/config/ANSWERS_TABLE` | `guidr-answers` | answers-service |
| `/guidr/config/USERS_TABLE` | `guidr-users` | auth-service, users-service |
| `/guidr/config/SNS_TOPIC_ARN` | `arn:aws:sns:us-east-1:...` | notification-worker |

---

## 🛠️ Local Development

```bash
# 1. Clone the repository
git clone https://github.com/Aadi1903/Guidr.git
cd Guidr

# 2. Install frontend dependencies
cd frontend
npm install

# 3. Create local environment file
cat > .env << EOF
VITE_API_URL=https://ms3stxtwuf.execute-api.us-east-1.amazonaws.com/prod
VITE_COGNITO_USER_POOL_ID=your-pool-id
VITE_COGNITO_CLIENT_ID=your-client-id
VITE_COGNITO_REGION=us-east-1
EOF

# 4. Start the development server
npm run dev
# → App running at http://localhost:5173
```

---

## 📄 License

This project is built for educational and portfolio purposes.
