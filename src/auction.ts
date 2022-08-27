import { Attachment, GuildMember, Message, Snowflake, TextChannel, ThreadChannel } from 'discord.js';

import { DateUtils, MessageUtils } from './better-discord';
import { Bid } from './bid';
import { Options } from './options';

export class Auction {

    public description: string;
    public duration: number;
    public endTime: Date;
    public imagesUrls: Attachment[] = [];
    public channel: TextChannel;
    public minPrice: number;
    public minIncrement: number;
    public schedule: number;

    public highestBid: number = 0;
    public highestBidder: Snowflake;
    public bidders: Map<string, GuildMember> = new Map<string, GuildMember>();
    private ongoing: boolean;
    private thread: ThreadChannel;
    public startTime: Date;

    public messagesReceived: Message<boolean>[] = [];
    public lastBidMessage: Message<boolean>;
    public auctionStartMessage: Message<boolean>;
    public channelMessage: Message<boolean>;

    public bidHistory: Bid[] = [];

    constructor(description: string, duration: number, endTime: Date, imagesUrls: Attachment[], channel: any, minPrice: number, minIncrement: number, schedule: number) {
        this.description = description;
        this.duration = duration;
        this.endTime = endTime;
        this.imagesUrls = imagesUrls;
        this.channel = channel;
        this.minPrice = minPrice;
        this.minIncrement = minIncrement;
        this.schedule = schedule;

        this.ongoing = false;
        this.highestBid = 0;

        this.bidHistory = [];

        this.startTime = new Date()
        if (this.schedule) {
            this.startTime.setMinutes(this.startTime.getMinutes() + this.schedule);
            this.endTime.setMinutes(this.endTime.getMinutes() + this.schedule);
        }
    }

    public start(): void {
        this.ongoing = true;
        this.highestBid = 0;
        this.bidHistory = [];
    }

    public end(): AuctionResult {

        delete this.schedule;
        this.ongoing = false;
        this.thread.setLocked(true, 'Enchère terminée');

        if (this.minPrice && this.minPrice > this.highestBid) {
            return {
                winnerId: null,
                price: null
            }
        }

        return {
            winnerId: this.highestBidder,
            price: this.highestBid
        }
    }

    public bid(bidder: Snowflake, amount: number, user: GuildMember): boolean {
        this.highestBidder = bidder;
        this.highestBid = amount;
        this.bidHistory.push({ bidder, amount, date: new Date() });
        var { remainingHours, remainingMinutes } = DateUtils.getRemainingTime(this.endTime);
        if (remainingHours == 0 && remainingMinutes <= Options.BID_MINUTES_THRESHOLD_BEFORE_ADDING_TIME) {
            this.endTime.setMinutes(this.endTime.getMinutes() + Options.BID_MINUTES_TO_ADD_AFTER_THRESHOLD);
            return true;
        }

        this.bidders[bidder] = user;
    }

    public isOngoing(): boolean {
        return this.ongoing;
    }

    public isOutbid(amount: number): boolean {
        return amount > this.highestBid;
    }

    public isValidIncrement(amount: number): boolean {
        return (amount - this.highestBid) >= this.minIncrement;
    }

    public setThread(thread: ThreadChannel) {
        if (this.thread) {
            throw new Error(`Thread already set for auction \' ${this.description}\'`);
        }
        this.thread = thread;
    }

    public getThread(): ThreadChannel {
        return this.thread;
    }

    public deleteMessages(): void {
        this.messagesReceived.forEach(message => {
            if (message) {
                MessageUtils.tryDelete(message);
            };
        });
        this.messagesReceived = [];
    }

    public getNLastBids(n: number): Bid[] {
        return this.bidHistory
            .slice(-n, -1)
            .reverse();
    }
}

export interface AuctionResult {
    winnerId: string;
    price: number;
}