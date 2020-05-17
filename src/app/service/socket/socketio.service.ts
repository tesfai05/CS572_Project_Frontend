import { Injectable } from '@angular/core';
import * as io from 'socket.io-client';
import { environment } from 'src/environments/environment';
import { User } from 'src/app/model/user';
import { NotificationCode } from 'src/app/model/notificationcode';
import { MatSnackBar } from '@angular/material/snack-bar';
import {  Router } from '@angular/router';
import { Howl } from 'howler';
import {NgxPubSubService} from "@pscoped/ngx-pub-sub";

export interface SocketResponse {
   reason: NotificationCode;
   follower: User,
   content: String
}

export enum USER_STATUS {
    ONLINE,OFFLINE
}


@Injectable({
  providedIn: 'root'
})
export class SocketioService {

  socket:io = io(environment.socketEndpoint);
  user: User;

  sound = new Howl({
    src: ['assets/sound/filling-your-inbox.mp3']
  })

  constructor(private snackbar: MatSnackBar,private router: Router,private pubSub: NgxPubSubService) { }


  onNotificationReceivedEvent(topic: String): void{
    this.socket.on(`${topic}`,(data: SocketResponse) => {

      this.sound.play()
        switch(data.reason){
           case NotificationCode.FOLLOW:
              let followSnackRef = this.snackbar.open(`${data.follower.username} followed you`,'View Follower',
                    {politeness:"polite",horizontalPosition: "center",verticalPosition: "top"})


                followSnackRef.onAction().subscribe((action) => {
                  this.router.navigateByUrl(`/profile/${data.follower._id}/timeline`)
              })
           break;
           case NotificationCode.UNFOLLOW:
              let unfollowSnackRef = this.snackbar.open(`${data.follower.username} followed you`,'View Follower',
              {politeness:"polite",horizontalPosition: "center",verticalPosition: "top"})

              unfollowSnackRef.onAction().subscribe((action) => {
                  this.router.navigateByUrl(`/profile/${data.follower._id}/timeline`)
              })
           break;
           case NotificationCode.NEWPOST:
              let postSnackRef = this.snackbar.open(`New post Available`, 'View')

              postSnackRef.onAction().subscribe((action) => this.router.navigateByUrl('/home'))
           break;
           case NotificationCode.POST_VERIFIED:
            let verifiedSnackRef = this.snackbar.open(`Your post has been reviewed and post`, 'View')

            verifiedSnackRef.onAction().subscribe((action) => this.router.navigateByUrl('/home'))
           break;
           case NotificationCode.ACCOUNT_BLOCKED:
             this.socket.disconnect()
             localStorage.clear()
             this.router.navigateByUrl('/login')
            this.snackbar.open(`Sorry your Account has been blocked.Please contact Administrator to review your account`)
           break;

          case NotificationCode.PROFILE_PIC_UPDATE:
            this.snackbar.open(`Profile Pic Updated`,'Ok');
            this.pubSub.publishEvent('PROFILE_CHANGED')
            break;

          case NotificationCode.POST_CREATED:
             this.snackbar.open(`Post Created Successfully`,`Ok`)
             this.pubSub.publishEvent(`POST_CREATED_EVENT`,{});
            break

          case NotificationCode.UNHEALTHY_POST:
              this.snackbar.open(`${data.content}`,'Ok')
              this.pubSub.publishEvent(`UNHEALTHY_POST_EVENT`,{})
            break;

          default:
              this.snackbar.open(`You have a new notification`,'Ok')
            break
        }
    })

  }


  connect(userId: String,status:USER_STATUS): void{
    console.log(this.socket)
    this.socket.emit('user_status',{userId: userId,status: status})
  }

  disconnect(userId: String,status: USER_STATUS = USER_STATUS.OFFLINE):void{
    this.connect(userId,status)
    this.socket.disconnect()
  }

}
