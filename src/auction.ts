import { Message, Snowflake, ThreadChannel } from 'discord.js';

import { Bid } from './bid';

export class Auction {

    public description: string;
    public endTime: Date;
    public imagesUrls: string[] = [];

    public highestBid: number = 0;
    public highestBidder: Snowflake;
    private ongoing: boolean;
    private thread: ThreadChannel;

    public messagesReceived: Message<boolean>[] = [];
    public lastBidMessage: Message<boolean>;
    public auctionStartMessage: Message<boolean>;

    public bidHistory: Bid[] = [];

    constructor(description: string, endTime: Date, imagesUrls: string[]) {
        this.description = description;
        this.endTime = endTime;
        this.imagesUrls = imagesUrls;

        this.ongoing = false;
        this.highestBid = 0;

        this.bidHistory = [];
    }

    public start(): void {
        this.ongoing = true;
        this.highestBid = 0;
        this.bidHistory = [];
    }

    public end(): void {
        this.ongoing = false;
        this.thread.setLocked(true, 'Enchère terminée');
    }

    public bid(bidder: Snowflake, amount: number) {
        this.highestBidder = bidder;
        this.highestBid = amount;
        this.bidHistory.push({ bidder, amount, date: new Date() });
    }

    public isOngoing(): boolean {
        return this.ongoing;
    }

    public isOutbid(amount: number): boolean {
        return amount > this.highestBid;
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
                message.delete();
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