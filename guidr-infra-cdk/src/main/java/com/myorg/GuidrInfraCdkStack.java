package com.myorg;

import software.constructs.Construct;
import software.amazon.awscdk.Stack;
import software.amazon.awscdk.StackProps;
import software.amazon.awscdk.Duration;
import software.amazon.awscdk.services.lambda.DockerImageFunction;
import software.amazon.awscdk.services.lambda.DockerImageCode;
import software.amazon.awscdk.services.events.EventBus;
import software.amazon.awscdk.services.iam.PolicyStatement;
import software.amazon.awscdk.services.iam.Effect;

public class GuidrInfraCdkStack extends Stack {
    public GuidrInfraCdkStack(final Construct scope, final String id) {
        this(scope, id, null);
    }

    public GuidrInfraCdkStack(final Construct scope, final String id, final StackProps props) {
        super(scope, id, props);

        // 1. Create an Event Bus (EventBridge) - Professional way to decouple services
        EventBus bus = EventBus.Builder.create(this, "GuidrEventBus")
                .eventBusName("guidr-event-bus-cdk")
                .build();

        // 2. Define the Questions Service as a Docker Container Lambda
        // CDK will automatically build the Docker image from your Dockerfile!
        DockerImageFunction questionsFunc = DockerImageFunction.Builder.create(this, "QuestionsServiceDocker")
                .code(DockerImageCode.fromImageAsset("../backend/lambdas/questions-service"))
                .memorySize(512)
                .timeout(Duration.seconds(30))
                .build();

        // 3. Grant permissions for Rekognition (AI) and EventBridge
        // This is the "Java way" of adding the permissions we discussed
        questionsFunc.addToRolePolicy(PolicyStatement.Builder.create()
                .effect(Effect.ALLOW)
                .actions(java.util.Arrays.asList(
                    "events:PutEvents",
                    "rekognition:DetectModerationLabels"
                ))
                .resources(java.util.Arrays.asList("*"))
                .build());
    }
}
