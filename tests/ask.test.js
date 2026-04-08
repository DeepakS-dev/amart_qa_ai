import {
  jest,
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
} from '@jest/globals';

const mockRunAskPipeline = jest.fn();
const mockRecordAskInteraction = jest.fn();

beforeAll(async () => {
  await jest.unstable_mockModule('../src/services/rag.service.js', () => ({
    runAskPipeline: (...args) => mockRunAskPipeline(...args),
  }));

  await jest.unstable_mockModule('../src/services/askHistory.service.js', () => ({
    recordAskInteraction: (...args) => mockRecordAskInteraction(...args),
    listRecentAskHistoryForUser: jest.fn(),
  }));

  await jest.unstable_mockModule('../src/middleware/authenticate.js', () => ({
    authenticate: (req, res, next) => {
      req.user = {
        id: '507f1f77bcf86cd799439011',
        email: 'test@example.com',
        name: 'Test',
      };
      next();
    },
  }));
});

let app;
let request;

beforeAll(async () => {
  const { default: appModule } = await import('../src/app.js');
  const supertest = (await import('supertest')).default;
  app = appModule;
  request = supertest(app);
  jest.spyOn(console, 'log').mockImplementation(() => {});
});

afterAll(() => {
  jest.restoreAllMocks();
});

describe('POST /api/ask', () => {
  beforeEach(() => {
    mockRunAskPipeline.mockResolvedValue({
      answer:
        'Customers may request a full refund within 14 days of purchase for unused digital subscriptions.',
      sources: ['Refund and return policy'],
      confidence: 'high',
    });
    mockRecordAskInteraction.mockResolvedValue(undefined);
  });

  it('returns structured data with answer, sources, and confidence (LLM mocked via RAG pipeline)', async () => {
    const res = await request
      .post('/api/ask')
      .send({ question: 'What is the refund window for digital subscriptions?' })
      .expect(200)
      .expect('Content-Type', /json/);

    expect(res.body).toEqual({
      success: true,
      data: {
        answer:
          'Customers may request a full refund within 14 days of purchase for unused digital subscriptions.',
        sources: ['Refund and return policy'],
        confidence: 'high',
      },
    });

    expect(res.body.data).toMatchObject({
      answer: expect.any(String),
      sources: expect.any(Array),
      confidence: expect.stringMatching(/^(high|medium|low)$/),
    });

    expect(mockRunAskPipeline).toHaveBeenCalledWith(
      'What is the refund window for digital subscriptions?'
    );
    expect(mockRecordAskInteraction).toHaveBeenCalledWith({
      userId: '507f1f77bcf86cd799439011',
      question: 'What is the refund window for digital subscriptions?',
      answer:
        'Customers may request a full refund within 14 days of purchase for unused digital subscriptions.',
      sources: ['Refund and return policy'],
    });
  });
});
