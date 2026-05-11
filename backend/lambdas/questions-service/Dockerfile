# Use the official AWS Lambda Node.js image
FROM public.ecr.aws/lambda/nodejs:18

# Copy the function code and package.json
COPY index.js package.json ${LAMBDA_TASK_ROOT}/

# Install dependencies
RUN npm install --omit=dev

# Set the handler
CMD [ "index.handler" ]
