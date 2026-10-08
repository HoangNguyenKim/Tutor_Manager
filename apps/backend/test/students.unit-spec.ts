import { ConflictException, NotFoundException } from '@nestjs/common';
import { StudentsService } from '../src/students/students.service';

function repoStub() {
  return {
    list: jest.fn(),
    findById: jest.fn(),
    counts: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    setActive: jest.fn(),
  };
}

describe('StudentsService (unit)', () => {
  it('trims input on create', async () => {
    const repo = repoStub();
    repo.create.mockImplementation((d: unknown) => Promise.resolve(d));
    const svc = new StudentsService(repo as never);
    await svc.create({ name: '  An  ', phone: '  ', subject: ' Toán ' });
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'An', phone: undefined, subject: 'Toán' }),
    );
  });

  it('rejects empty name on update (422)', async () => {
    const repo = repoStub();
    repo.findById.mockResolvedValue({ id: 's1', isActive: true });
    const svc = new StudentsService(repo as never);
    await expect(svc.update('s1', { name: '   ' })).rejects.toBeInstanceOf(ConflictException);
  });

  it('throws 404 for unknown student', async () => {
    const repo = repoStub();
    repo.findById.mockResolvedValue(null);
    const svc = new StudentsService(repo as never);
    await expect(svc.get('missing', false)).rejects.toBeInstanceOf(NotFoundException);
    await expect(svc.archive('missing')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('archive is idempotent', async () => {
    const repo = repoStub();
    repo.findById.mockResolvedValue({ id: 's1', isActive: false });
    const svc = new StudentsService(repo as never);
    await svc.archive('s1');
    expect(repo.setActive).not.toHaveBeenCalled();
  });
});
