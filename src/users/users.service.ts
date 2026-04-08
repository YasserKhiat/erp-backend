import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from '../common/constants/domain-enums';
import { CreateClientAddressDto } from './dto/create-client-address.dto';
import { UpdateClientPreferencesDto } from './dto/update-client-preferences.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async createUser(data: {
    email: string;
    fullName: string;
    passwordHash: string;
    role?: UserRole;
    phone?: string;
  }) {
    return this.prisma.user.create({
      data: {
        email: data.email,
        fullName: data.fullName,
        passwordHash: data.passwordHash,
        role: data.role ?? UserRole.CLIENT,
        phone: data.phone,
      },
    });
  }

  async findById(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async listAddresses(userId: string) {
    return this.prisma.clientAddress.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async createAddress(userId: string, dto: CreateClientAddressDto) {
    return this.prisma.$transaction(async (tx) => {
      if (dto.isDefault) {
        await tx.clientAddress.updateMany({
          where: { userId, isDefault: true },
          data: { isDefault: false },
        });
      }

      return tx.clientAddress.create({
        data: {
          userId,
          label: dto.label,
          addressLine: dto.addressLine,
          city: dto.city,
          postalCode: dto.postalCode,
          isDefault: dto.isDefault ?? false,
        },
      });
    });
  }

  async setDefaultAddress(userId: string, addressId: string) {
    const address = await this.prisma.clientAddress.findFirst({
      where: { id: addressId, userId },
      select: { id: true },
    });

    if (!address) {
      throw new NotFoundException('Address not found');
    }

    await this.prisma.$transaction([
      this.prisma.clientAddress.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      }),
      this.prisma.clientAddress.update({
        where: { id: addressId },
        data: { isDefault: true },
      }),
    ]);

    return this.listAddresses(userId);
  }

  async removeAddress(userId: string, addressId: string) {
    const address = await this.prisma.clientAddress.findFirst({
      where: { id: addressId, userId },
      select: { id: true, isDefault: true },
    });

    if (!address) {
      throw new NotFoundException('Address not found');
    }

    await this.prisma.clientAddress.delete({ where: { id: addressId } });

    if (address.isDefault) {
      const latestAddress = await this.prisma.clientAddress.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });

      if (latestAddress) {
        await this.prisma.clientAddress.update({
          where: { id: latestAddress.id },
          data: { isDefault: true },
        });
      }
    }

    return this.listAddresses(userId);
  }

  async upsertPreferences(userId: string, dto: UpdateClientPreferencesDto) {
    return this.prisma.clientPreference.upsert({
      where: { userId },
      update: {
        dietaryRestrictions: dto.dietaryRestrictions,
        allergens: dto.allergens,
        preferredDeliveryNotes: dto.preferredDeliveryNotes,
        marketingOptIn: dto.marketingOptIn,
      },
      create: {
        userId,
        dietaryRestrictions: dto.dietaryRestrictions,
        allergens: dto.allergens,
        preferredDeliveryNotes: dto.preferredDeliveryNotes,
        marketingOptIn: dto.marketingOptIn ?? false,
      },
    });
  }

  async getPreferences(userId: string) {
    return this.prisma.clientPreference.findUnique({ where: { userId } });
  }

  async addFavorite(userId: string, menuItemId: string) {
    const menuItem = await this.prisma.menuItem.findUnique({
      where: { id: menuItemId },
      select: { id: true },
    });

    if (!menuItem) {
      throw new NotFoundException('Menu item not found');
    }

    try {
      await this.prisma.favoriteMenuItem.create({
        data: { userId, menuItemId },
      });
    } catch {
      throw new BadRequestException('Menu item already in favorites');
    }

    return this.listFavorites(userId);
  }

  async removeFavorite(userId: string, menuItemId: string) {
    const favorite = await this.prisma.favoriteMenuItem.findUnique({
      where: {
        userId_menuItemId: {
          userId,
          menuItemId,
        },
      },
      select: { id: true },
    });

    if (!favorite) {
      throw new NotFoundException('Favorite not found');
    }

    await this.prisma.favoriteMenuItem.delete({
      where: {
        userId_menuItemId: {
          userId,
          menuItemId,
        },
      },
    });

    return this.listFavorites(userId);
  }

  listFavorites(userId: string) {
    return this.prisma.favoriteMenuItem.findMany({
      where: { userId },
      include: {
        menuItem: {
          include: {
            category: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
