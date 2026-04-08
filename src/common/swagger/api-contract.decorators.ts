import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiResponseOptions,
} from '@nestjs/swagger';

type SchemaObject = Record<string, unknown>;

type SuccessOptions = {
  description: string;
  dataSchema?: SchemaObject;
  message?: string;
};

type PaginatedOptions = {
  description: string;
  itemSchema?: SchemaObject;
};

const ERROR_SCHEMA: SchemaObject = {
  type: 'object',
  properties: {
    success: { type: 'boolean', example: false },
    error: { type: 'string', example: 'BAD_REQUEST' },
    message: { type: 'string', example: 'Bad Request' },
  },
  required: ['success', 'error', 'message'],
};

function successSchema(dataSchema?: SchemaObject, message?: string): SchemaObject {
  const properties: Record<string, unknown> = {
    success: { type: 'boolean', example: true },
    data: dataSchema ?? { type: 'object' },
  };

  if (message) {
    properties.message = { type: 'string', example: message };
  }

  return {
    type: 'object',
    properties,
    required: message ? ['success', 'data', 'message'] : ['success', 'data'],
  };
}

export function ApiContractOk(options: SuccessOptions) {
  return ApiOkResponse({
    description: options.description,
    schema: successSchema(options.dataSchema, options.message),
  });
}

export function ApiContractPaginatedOk(options: PaginatedOptions) {
  return ApiOkResponse({
    description: options.description,
    schema: successSchema({
      type: 'array',
      items: options.itemSchema ?? { type: 'object' },
    }),
    content: {
      'application/json': {
        example: {
          success: true,
          data: [],
          meta: {
            page: 1,
            limit: 10,
            total: 0,
          },
        },
      },
    },
  } as ApiResponseOptions);
}

export function ApiContractListOk(options: PaginatedOptions) {
  return ApiOkResponse({
    description: options.description,
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'array',
          items: options.itemSchema ?? { type: 'object' },
        },
        meta: {
          type: 'object',
          properties: {
            page: { type: 'number', example: 1 },
            limit: { type: 'number', example: 10 },
            total: { type: 'number', example: 120 },
          },
          required: ['page', 'limit', 'total'],
        },
      },
      required: ['success', 'data', 'meta'],
    },
    content: {
      'application/json': {
        example: {
          success: true,
          data: [],
          meta: {
            page: 1,
            limit: 10,
            total: 120,
          },
        },
      },
    },
  } as ApiResponseOptions);
}

export function ApiContractErrors() {
  return applyDecorators(
    ApiBadRequestResponse({
      description: 'Bad request',
      schema: ERROR_SCHEMA,
    }),
    ApiForbiddenResponse({
      description: 'Forbidden',
      schema: ERROR_SCHEMA,
    }),
    ApiNotFoundResponse({
      description: 'Resource not found',
      schema: ERROR_SCHEMA,
    }),
    ApiConflictResponse({
      description: 'Business conflict',
      schema: ERROR_SCHEMA,
    }),
  );
}
